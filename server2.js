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
  console.log(username , password)
  try {
    const existingUser = await prisma.users.findUnique({
      where: { username },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Username already taken.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.users.create({
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


////Home page details 

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  try {

    const user = await prisma.users.findUnique({
      where: { username },
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

      await prisma.loginAttempt.create({
        data: {
          userId: user.identifier,
          attemptTime: new Date(), 
        },
      });

    
      const failedAttempts = await prisma.loginAttempt.count({
        where: {
          userId: user.identifier,
          attemptTime: {
            gte: new Date(new Date().setHours(new Date().getHours() - 12)), // Last 12 hours
          },
        },
      });

      //db mai time utc mai store kar raha hai lekin hume ist mai chaheye
      ///////////

      if (failedAttempts >= 5) {
        const lockUntil = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
        await prisma.users.update({
          where: { identifier: user.identifier },
          data: { lock_until: lockUntil },
        });

        return res.status(403).json({
          error: `Account locked. Try again after ${lockUntil.toLocaleString()}`,
        });
      }

      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    
    await prisma.loginAttempt.deleteMany({
      where: { userId: user.identifier },
    });
    await prisma.users.update({
      where: { identifier: user.identifier },
      data: { lock_until: null }, 
    });

    // Generate JWT token
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


//token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwidXNlcm5hbWUiOiJOdXNoa2EgQ2hhd2xhIiwiaWF0IjoxNzQ1OTk1MDI3LCJleHAiOjE3NDU5OTg2Mjd9.C3sF5HPEimzaikpQttOPoaZCugayZgTxJEz6SxcyrLU

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
