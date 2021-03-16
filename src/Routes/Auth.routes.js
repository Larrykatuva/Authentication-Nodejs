const express = require('express');
const router = express.Router();
const createError = require('http-errors');
//Importing controllers
const UserController = require('../Controllers/Auth.Controller');


//Creating new user
router.post('/signup', UserController.createNewUser);

//Email user verification
router.get('/activate/:id/:token', UserController.verifyEmail);

//Account login
router.post('/login', UserController.loginUser);

//Password reset link
router.post('/reset-password', UserController.resetPassword);

//New Password
router.post('/new-password/:id/:token', UserController.setNewPassword);


module.exports = router;