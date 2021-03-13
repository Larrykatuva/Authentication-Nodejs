const express = require('express');
const bp = require('body-parser');
const createError = require('http-errors');
const dotenv = require('dotenv').config();


const app = express();
app.use(bp.json());


/**
 * Connecting to Mongo Database by invoking it
 */
 require('./initDb')();



/**
 * Authentication Routes
 */
 const AuthRoute = require('./src/Routes/Auth.routes');
 app.use('/auth', AuthRoute);





/**
 * Handling Errors
 */
 app.use((req, res, next) => {
    next(createError(404, 'Not found'));
})

app.use((err, req, res, next) => {
    res.status(err.status || 500)
    res.send({
        error: true,
        errorMessage: {
            status: err.status || 500,
            message: err.message
        }
    })
})





/**
 * Running the server
 */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log('Server started on port '+PORT+'...');
})