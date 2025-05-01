import express from "express";
import bcrypt from "bcrypt";
import {Pool} from "pg"
import jwt from "jsonwebtoken";
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const app = express();

// const pool = new Pool({
//     user : "postgres",
//     host : "localhost",
//     database : "assessment",
//     password : "Nahipata@1",
//     port : 5432,
// })


app.use(express.json());

const JWT_SECRET = 'supersecretkey123!';

app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;

  try {
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Username already taken.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
      },
    });

    res.status(201).json({ message: 'User registered successfully.', user: newUser });
  } catch (error) {
    console.error('Register Error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});


//**********************************user login************************************//



app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    try {
      // const userResult = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
      // const user = userResult.rows[0];
      const user  = await prisma.User.findUnique({
        where : { username},
      });
  
      if (!user) {
        return res.status(401).json({ error: 'Invalid username or password.' });
      }
  
      
      if (user.lock_until && new Date(user.lock_until) > new Date()) {
        return res.status(403).json({
          error: `Account locked. Try again after ${new Date(user.lock_until).toLocaleString()}`,
        });
      }
  
      const isPasswordCorrect = await bcrypt.compare(password, user.password);
      if (!isPasswordCorrect) {
        //console.log(new Date().toLocaleString())
        //let currentTime = new Date().toLocaleString();
        const ISTOffset = 5.5 * 60 * 60 * 1000; // IST is UTC +5:30
const ISTDate = new Date(Date.now() + ISTOffset);

// Convert IST to UTC before saving to DB
const UTCDate = new Date(ISTDate.toISOString());
        // await pool.query(
        //   'INSERT INTO login_attempts (user_id, attempt_time) VALUES ($1, NOW())',
        //   [user.identifier]
        // );
        await prisma.loginAttempt.create({
          data : {
            userId : user.identifier,
            attemptTime  : UTCDate ,//yaha changes kia 
          },
        });
  
        // const attemptsQuery = await pool.query(
        //   `SELECT COUNT(*) FROM login_attempts 
        //    WHERE user_id = $1 AND attempt_time > NOW() - INTERVAL '12 HOURS'`,
        //   [user.identifier]
        // );
        // const failedAttempts = parseInt(attemptsQuery.rows[0].count);

        const failedAttempts = await prisma.loginAttempt.count({
          where: {
            userId: user.identifier,
            attemptTime: {
              gte: new Date(Date.now() -   12 * 1000), // last 12 hours
            },
          },
        });
        
  
        if (failedAttempts >= 5) {
          const lockUntil = new Date(Date.now() + 60*1000); 
          //await pool.query('UPDATE users SET lock_until = $1 WHERE identifier = $2', [lockUntil, user.identifier]);
          await prisma.user.update({
            where : { identifier : user.identifier},
            data : { lock_until : lockUntil},
          })
          return res.status(403).json({
            error: `Account locked. Try again after ${lockUntil.toLocaleString()}`,
          });
        }
  
        return res.status(401).json({ error: 'Invalid username or password.' });
      }
  
      //await pool.query('DELETE FROM login_attempts WHERE user_id = $1', [user.identifier]);
      //await pool.query('UPDATE users SET lock_until = NULL WHERE identifier = $1', [user.identifier]);

      await prisma.loginAttempt.deleteMany({
        where : { userId : user.identifier},
      })

      // await prisma.user.update({
      //   where : { identifier : user.identifier},
      //   data : { lock_until : null},
      // });
  

      await prisma.user.update({
        where: {
          identifier: user.identifier,
        },
        data: {
          lock_until: null, // NOT "lock_untill"
        },
      });
      
      const token = jwt.sign({ id: user.identifier, username: user.username }, JWT_SECRET, {
        expiresIn: '1h',
      });
  
      res.status(200).json({
        message: 'Login successful',
        token,
        user: {
          id: user.identifier,
          username: user.username,
        },
      });
    } catch (error) {
      console.error('Login Error:', error);
      res.status(500).json({ error: 'Internal server error.' });
    }
  });

////Home page details 

//const jwt = require('jsonwebtoken'); 
//const JWT_SECRET = 'supersecretkey123!'; 
/*
app.get('/api/home', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1]; 

  if (!token) {
    return res.status(401).json({ error: 'No token provided.' });
  }

  try {
   
    const decoded = jwt.verify(token, JWT_SECRET); // Decodes and verifies the token
    
    return res.status(200).json({ message: `Welcome, ${decoded.username}` });
    
  } catch (error) {
   
    return res.status(401).json({ error: 'Unauthorized. Invalid or expired token.' });
  }
});
*/

//token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwidXNlcm5hbWUiOiJOdXNoa2EgQ2hhd2xhIiwiaWF0IjoxNzQ1OTk1MDI3LCJleHAiOjE3NDU5OTg2Mjd9.C3sF5HPEimzaikpQttOPoaZCugayZgTxJEz6SxcyrLU

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
