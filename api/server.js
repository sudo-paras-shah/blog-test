import express from "express";

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

app.use(express.json());

app.get('/', (req, res) => {
    res.render('index.ejs');
});

app.get('/blog', (req, res) => {
    res.render('blog.ejs');
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
