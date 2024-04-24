const express = require("express");
const path = require("path");
const collection = require("./config");
const bcrypt = require("bcrypt")
const session = require("express-session");
const speakeasy = require("speakeasy");
const nodemailer = require("nodemailer");

const app = express();
// convert data into json format
app.use(express.json());

app.use(express.static("public"));

app.use(express.urlencoded({ extended: false }));

app.set("view engine", "ejs");

app.get("/", (req, res) => {
    res.render("login");
});

app.use(
    session({
        secret: "team14",
        resave: false,
        saveUninitialized: false
    })
);

//pls let me use someone else's email...
const transporter = nodemailer.createTransport({
    service: 'yahoo',
    auth: {
        user: 'peksonmichael@yahoo.com',
        pass: 'irtm xdnj jfcy ddvl'
    }
});

function generateVerificationCode(){
    return Math.floor(100000 + Math.random() * 900000);
}

app.get("/signup", (req, res) => {
    res.render("signup");
});

// Register User
app.post("/signup", async (req, res) => {

    const data = {
        name: req.body.username,
        email: req.body.user_email,
        password: req.body.password,
        secretKey: speakeasy.generateSecret().base32
    }

    // Check if the username already exists in the database
    const existingUser = await collection.findOne({ name: data.name });

    if (existingUser) {
        res.send('User already exists. Please choose a different username.');
    } else {
        const saltRounds = 13; // Number of salt rounds for bcrypt
        const hashedPassword = await bcrypt.hash(data.password, saltRounds);

        data.password = hashedPassword; // Replace the original password with the hashed one

        const userdata = await collection.insertMany(data);
        console.log(userdata);
        res.send('Create account successfully')
    }

});



// Login user 
app.post("/login", async (req, res) => {
    try {
        const check = await collection.findOne({ name: req.body.username });
        if (!check) {
            res.send("User name not found");
            return;
        }

        // Compare passwords 
        const isPasswordMatch = await bcrypt.compare(req.body.password, check.password);
        if (!isPasswordMatch) {
            res.send("Incorrect password");
        } else {
            const verificationCode = generateVerificationCode();
            req.session.verificationCode = verificationCode;

            const mailOptions = {
                from: 'peksonmichael@yahoo.com',
                to: check.email,
                subject: 'Verification Code for Login',
                text: `Your verification code is: ${verificationCode}`
            };

            await transporter.sendMail(mailOptions);
            res.redirect("/otp_ver");
        }
    } catch (error) {
        console.error("Error:", error);
        res.send("An error occurred while processing your request.");
    }
});

app.get("/otp_ver", (req, res) => {
    res.render("otp_ver");
});

app.post("/otp_ver", async (req, res) => {
    try {
        const submittedCode = req.body.otp;
        const storedCode = req.session.verificationCode;
        
        if(!submittedCode) { return res.send("There is no submitted code!"); }
        else if(!storedCode) { return res.send("There is no stored code!"); }
        else if(submittedCode != storedCode) { return res.send("Incorrect verification code"); }

        req.session.verificationCode = null;
        res.redirect("/home");
    } catch(error){
        console.error("Error:", error);
        res.send("An error occurred 2");
    }
});

app.get("/home", (req, res) => {
    res.render("home");
});


// Define Port for Application
const port = 5005;
app.listen(port, () => {
    console.log(`Server listening on port ${port}`)
});