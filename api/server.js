import 'dotenv/config';
import express from "express";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));

import { createClient } from "@supabase/supabase-js";
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';

const app = express();
const PORT = 3000;

// Enable CORS for all routes
app.use((req, res, next) => {
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader(
		'Access-Control-Allow-Methods',
		'GET, POST, PUT, DELETE, PATCH'
	);
	res.setHeader(
		'Access-Control-Allow-Headers',
		'Content-Type, Authorization'
	);
	next();
});
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// Middleware for auth check
const requireAuth = async (req, res, next) => {
    const token = req.cookies.auth_token;
    if (!token) {
        return res.status(401).json({ message: 'Authentication required.' });
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
        return res.status(401).json({ message: 'Invalid token.' });
    }
    
    req.user = user; 
    req.token = token;
    next();
};

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/blog', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/blog.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/login.html'));
});

app.get('/profile', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/profile.html'));
});


// GET all posts
app.get('/api/posts', async (req, res) => {
    const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) {
        return res.status(500).json({ message: error.message });
    }

    res.json(data);
});


// GET posts by current authenticated user
app.get('/api/posts/me', requireAuth, async (req, res) => {
    const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', req.user.id) // Filter by the authenticated user's ID
        .order('created_at', { ascending: false });

    if (error) {
        return res.status(500).json({ message: error.message });
    }
    res.json(data);
});


// POST a new post for current user
app.post('/api/posts', requireAuth, async (req, res) => {
    const supabaseUser = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY,
        { global: { headers: { Authorization: `Bearer ${req.token}` } } }
    );

    const { data, error } = await supabaseUser
        .from("posts")
        .insert({
        title: req.body.title,
        content: req.body.content,
        user_id: req.user.id,
        })
        .select();

    if (error) {
        console.error(error);
        return res.status(500).json({ message: error.message });
    }

    res.status(201).json(data[0]);
});

// PATCH post made by current user
app.patch('/api/posts/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    const { title, content } = req.body;

    const { data, error } = await supabase
        .from('posts')
        .update({ title, content })
        .eq('id', id)
        .eq('user_id', req.user.id); // Double-check ownership in the query
        
    if (error) {
        return res.status(500).json({ message: error.message });
    }
    res.status(200).json({ message: 'Post updated successfully' });
});

// DELETE post made by current user
app.delete('/api/posts/:id', requireAuth, async (req, res) => {
    const { id } = req.params;

    const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', id)
        .eq('user_id', req.user.id); // Double-check ownership
    
    if (error) {
        return res.status(500).json({ message: error.message });
    }
    res.status(200).json({ message: 'Post deleted successfully' });
});

// POST a new login and set cookie for user
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    res.cookie('auth_token', data.session.access_token, {
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000,
        // secure: true,
        // sameSite: true
    });
    res.redirect('/blog');
});


// GET logout user and clear cookie
app.get('/api/logout', (req, res) => {
    res.clearCookie('auth_token');
    res.redirect('/blog'); 
});


// GET auth status
app.get('/api/auth/status', async (req, res) => {
    const token = req.cookies.auth_token;
    if (!token) {
        return res.json({ isLoggedIn: false });
    }
    
    const {data: { user }, error} = await supabase.auth.getUser(token);
    if (error || !user) {
        res.clearCookie('auth_token');
        return res.json({ isLoggedIn: false });
    }
    
    res.json({ isLoggedIn: true, email: user.email });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
