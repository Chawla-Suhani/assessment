import express from "express";
import bcrypt from "bcrypt";
import {Pool} from "pg"
import jwt from "jsonwebtoken";

const app = express();


const pool = new Pool({
    user : "postgres",
    host : "localhost",
    database : "assessment",
    password : "Nahipata@1",
    port : 5432,
})


app.use(express.json());

app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;

  try {
    if (!username || !password) {
      return res.status(400).json({ error:'Username and password are required.'});
    }

    const userCheck = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (userCheck.rows.length > 0) {
      return res.status(404).json({ error: 'Username already exists.' });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    await pool.query('INSERT INTO users (username, password) VALUES ($1, $2)',[username, hashedPassword]);
    res.status(201).json({ message: 'User registered successfully.' });

  } catch (err) {
    console.error('Registration Error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});


//**********************************user login************************************//

const JWT_SECRET = 'supersecretkey123!';


app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    try {
      const userResult = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
      const user = userResult.rows[0];
  
      if (!user) {
        return res.status(401).json({ error: 'Invalid username or password.' });
      }
  
      // Check if account is locked
      if (user.lock_until && new Date(user.lock_until) > new Date()) {
        return res.status(403).json({
          error: `Account locked. Try again after ${new Date(user.lock_until).toLocaleString()}`,
        });
      }
  
      const isPasswordCorrect = await bcrypt.compare(password, user.password);
      if (!isPasswordCorrect) {
        // Log failed login attempt
        await pool.query(
          'INSERT INTO login_attempts (user_id, attempt_time) VALUES ($1, NOW())',
          [user.identifier]
        );
  
        // Count failed attempts in last 12 hours
        const attemptsQuery = await pool.query(
          `SELECT COUNT(*) FROM login_attempts 
           WHERE user_id = $1 AND attempt_time > NOW() - INTERVAL '12 HOURS'`,
          [user.identifier]
        );
        const failedAttempts = parseInt(attemptsQuery.rows[0].count);
  
        if (failedAttempts >= 5) {
          const lockUntil = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
          await pool.query('UPDATE users SET lock_until = $1 WHERE identifier = $2', [lockUntil, user.identifier]);
          return res.status(403).json({
            error: `Account locked. Try again after ${lockUntil.toLocaleString()}`,
          });
        }
  
        return res.status(401).json({ error: 'Invalid username or password.' });
      }
  
      // Successful login: reset failed attempts
      await pool.query('DELETE FROM login_attempts WHERE user_id = $1', [user.identifier]);
      await pool.query('UPDATE users SET lock_until = NULL WHERE identifier = $1', [user.identifier]);
  
      // Generate JWT
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
app.get('/api/home', async (req, res) => {
  // Extract token from Authorization header
  const token = req.headers.authorization?.split(' ')[1]; // 

  if (!token) {
    return res.status(401).json({ error: 'No token provided.' });
  }

  try {
    // Verify the JWT token
    const decoded = jwt.verify(token, JWT_SECRET); // Decodes and verifies the token
    
    // If token is valid, return a message with username
    return res.status(200).json({ message: `Welcome, ${decoded.username}` });
    
  } catch (error) {
    
    return res.status(401).json({ error: 'Unauthorized. Invalid or expired token.' });
  }
});


//token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwidXNlcm5hbWUiOiJOdXNoa2EgQ2hhd2xhIiwiaWF0IjoxNzQ1OTk1MDI3LCJleHAiOjE3NDU5OTg2Mjd9.C3sF5HPEimzaikpQttOPoaZCugayZgTxJEz6SxcyrLU

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
