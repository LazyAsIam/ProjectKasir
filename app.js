import express from "express";
import Items from "./models/items.js";
import Users from "./models/users.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET;

const app = express();
const hostname = "127.0.0.1";
const port = 5000;

app.set('view engine', 'ejs');
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Middleware for authentication
const authToken = (req, res, next) => {
    const token = req.cookies?.token;
    if (!token) {
        return res.redirect("/login");
    }
    try {
        const decode = jwt.verify(token, JWT_SECRET);
        req.user = decode;
        next();
    } catch (error) {
        res.clearCookie("token", { httpOnly: true });
        return res.redirect("/login");
    }
};

// Temporary storage for daily, weekly, and monthly income
let dailyIncome = 0;
let weeklyIncome = 0;
let monthlyIncome = 0;

// Reset income counters periodically
setInterval(() => { dailyIncome = 0; }, 24 * 60 * 60 * 1000); // Reset daily income
setInterval(() => { weeklyIncome = 0; }, 7 * 24 * 60 * 60 * 1000); // Reset weekly income
setInterval(() => { monthlyIncome = 0; }, 30 * 24 * 60 * 60 * 1000); // Reset monthly income

app.get('/kasir', authToken, (req, res) => {
    Items.findAll()
        .then(items => {
            res.render('kasir', { 
                items, 
                dailyIncome, 
                weeklyIncome, 
                monthlyIncome, 
                user: req.user // Ensure 'user' is passed to the view
            });
        })
        .catch(err => {
            res.status(500).send("Error fetching items");
        });
});

// Route to process transactions
app.post('/kasir', authToken, (req, res) => {
    const { itemNames } = req.body; // Expect an array of item names

    Items.findAll({ where: { name: itemNames } })
        .then(items => {
            let total = 0;

            // Calculate total price and update stock
            items.forEach(item => {
                total += item.price;
                item.update({ qty_stock: item.qty_stock - 1 });
            });

            // Update income counters
            dailyIncome += total;
            weeklyIncome += total;
            monthlyIncome += total;

            res.redirect('/kasir');
        })
        .catch(err => {
            res.status(500).send("Error processing transaction");
        });
});

// Routes for login, logout, and main page
app.get('/login', (req, res) => {
    res.render("login", { msg: "" });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    Users.findOne({ where: { username: username, password: password } })
    .then(result => {
        if (result) {
            const { role } = result;
            const token = jwt.sign({ username: username, role: role }, JWT_SECRET, { expiresIn: "1h" });
            res.cookie("token", token, { httpOnly: true });
            res.redirect("/");
        } else {
            res.render("login", { msg: "username dan password salah" });
        }
    }).catch(err => {
        res.render("login", { msg: err });
    });
});

app.get('/logout', (req, res) => {
    res.clearCookie("token", { httpOnly: true });
    res.redirect("/");
});

app.get("/", authToken, (req, res) => {
    Items.findAll()
        .then(result => {
            const user = req.user;
            res.render("index", { barang: result, user: user });
        })
        .catch(err => {
            res.render("index", { barang: [], user: req.user });
        });
});

app.get("/tambah", authToken, (req, res) => {
    res.render("addData");
});

app.get("/edit/:id", authToken, (req, res) => {
    const id = req.params.id;
    Items.findOne({ where: { id: id } })
        .then(result => {
            if (result != null) {
                res.render("editData", { barang: result });
            } else {
                res.redirect("/");
            }
        })
        .catch(err => {
            res.redirect("/");
        });
});

// API to search items based on name
app.get('/api/items/search', (req, res) => {
    const { name } = req.query;
    Items.findAll({
        where: {
            name: {
                [Sequelize.Op.like]: `%${name}%`
            }
        }
    })
    .then(items => {
        res.json(items);
    })
    .catch(err => {
        res.status(500).send("Error searching items");
    });
});

// API to save transaction
app.post('/api/saveTransaction', (req, res) => {
    const { dailyIncome, weeklyIncome, monthlyIncome } = req.body;
    
    res.send("Transaction saved successfully!");
});

app.post("/api/items", authToken, (req, res) => {
    const { name, qty_stock, price } = req.body;
    Items.create({ name, qty_stock, price })
        .then(result => {
            res.send({ "status": 200, "error": null, "response": result });
        })
        .catch(err => {
            res.send({ "status": 500, "error": err, "response": null });
        });
});

app.put("/api/items/:id", (req, res) => {
    const { name, qty_stock, price } = req.body;
    const id = req.params.id;
    Items.update({ name, qty_stock, price }, { where: { id: id } })
        .then(result => {
            res.send({ "status": 200, "error": null, "response": result });
        })
        .catch(err => {
            res.send({ "status": 500, "error": err, "response": null });
        });
});

app.delete("/api/items/:id", authToken, (req, res) => {
    const id = req.params.id;
    Items.destroy({ where: { id: id } })
        .then(result => {
            res.send({ "status": 200, "error": null, "response": result });
        })
        .catch(err => {
            res.send({ "status": 500, "error": err, "response": null });
        });
});

app.listen(port, hostname, () => {
    console.log(`Server running at ${hostname}:${port}`);
});