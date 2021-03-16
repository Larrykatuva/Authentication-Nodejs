const User = require('../Models/User.Model');
const mongoose = require('mongoose');
const AuthValidators = require('../Validators/Auth.Validate');
const createError = require('http-errors');
const nodemailer = require('nodemailer');
const Bcrypt = require("bcryptjs");
const dotenv = require('dotenv').config();
const url = require('url');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

module.exports = {
    /**
     * Creating a new User
     * Arguments: none
     * Body: {name, email}
     */
    createNewUser: async (req, res, next) => {
        const {
            body: { username, email, password }
            } = req;
        //If username not provided
        if (!username) {
            next(createError(
                409, 
                "Username must be provided")
            ); 
        }
        //If email not provided
        if (!email) {
            next(createError(
                409, 
                "Email must be provided")
            ); 
        }
        //If password not exist
        if (!password) {
            next(createError(
                409, 
                "Password must be provided")
            ); 
        }
        try{
            // Check if user exist
            const UserDetails = await User.findOne({
                email
            });
            //If user does not exist create user
            if(!UserDetails){
                const salt = Bcrypt.genSaltSync(10);
                req.body.password = Bcrypt.hashSync(
                    req.body.password, 
                    salt
                );
                const user = new User(
                    req.body
                );
                const result = await user.save();

                if(result){
                    //Generating access token
                    const data = {
                        user: req.body.username,
                        email: req.body.email
                    }
                    const access_token = await jwt.sign({user: data}, process.env.PRIVATE_KEY);

                    //preparing redirect url
                    const myURL = new URL('http://localhost:3000/auth/activate/'+result._id+'/'+access_token);

                    const transporter = nodemailer.createTransport({
                        service: 'gmail',
                        auth: {
                        user: process.env.EMAIL,
                        pass: process.env.EMAIL_PASS,
                        }
                    });

                    var mailOptions = {
                        from: process.env.EMAIL,
                        to: email,
                        subject: 'Account Activation',
                        html: `
                            <h2>Please click on given link to activate account</h2>
                            <p>${myURL.href}</p>`
                    };

                    transporter.sendMail(mailOptions, function(error, info){
                        if (error) {
                            next(createError(
                                409, 
                                "Error when sending the email")
                            ); 
                        } else {
                            res.status(200).send({
                                error: false,
                                message: "Email send successfully"
                            });
                        }
                    });

                    res.status(200).send({
                        error: false,
                        message: "Email send successfully"
                    });
                }
            }
            else{
                next(createError(409, "Email already taken choose another one")); 
            }
        } catch (error){
            if(error.name === 'ValidationError') {
                next(createError(
                    422, 
                    error.message)
                );
                return;
            }
            next(error);
        }
    },

    /**
     * Verify user
     * Arguments: user_id, access_token
     */
    verifyEmail: async (req, res, next) => {
        const id = req.params.id;
        const token = req.params.token;

        jwt.verify(token, process.env.PRIVATE_KEY, (err, verifiedJwt) => {
            if(err){
                next(createError(400, "Token is invalid"));
            }else{
                try{
                    const updates = {
                        "is_verified": true
                    }; 
                    const options = { 
                        new: true
                    };
                    User.findByIdAndUpdate(
                        id, 
                        updates,
                        options)
                        .exec(function (err, result){    
                            res.status(200)
                                .send({
                                    error: false,
                                    message: "Account activation successful"
                                });
                        });
                } catch (error) {
                    if(error instanceof mongoose.CastError) {
                        next(createError(400, "User Id is invalid"));
                        return;
                    }
                    next(error);
                }
            }
        });
    },

    /**
     * Login User
     * Arguments: none
     * Body: {email, password}
     */
    loginUser: async (req, res, next) => {
        const {
            body: { email, password }
        } = req;
        //If email not provided
        if (!email) {
            next(createError(
                409, 
                "Email must be provided")
            ); 
        }
        //If username not provided
        if (!password) {
            next(createError(
                409, 
                "Password must be provided")
            ); 
        }
        try{
            //check if email exist
            const user = await User.findOne({
                email
            });
            //if no user found
            if(!user){
                next(createError(
                    404,
                    "Invalid user email"
                ));
            }
            if(!user.is_verified){
                next(createError(
                    404,
                    "User account is not activated"
                ));
                return;
            }
            if(user && Bcrypt.compareSync(
                password, 
                user.password
                )){
                const access_token = await jwt.sign(
                    {user: user}, 
                    process.env.PRIVATE_KEY
                );
                res.status(200).send({
                    error: false,
                    message: "Login successful",
                    access_token: access_token,
                    user: user,
                });
                return;
            }
            next(createError(
                404,
                "Incorrect user details"
            ));
        } catch (error){
            next(createError(
                422, 
                error.message)
            );
        }
    },

    /**
     * Reset user password link
     * Arguments: none
     * Body: {email}
     */
    resetPassword: async(req, res, next) => {
        const {
            body: {email }
            } = req;
        //If email not provided
        if (!email) {
            next(createError(
                409, 
                "Email must be provided")
            ); 
        }
        try{
            //check if user with email exist
            const user = await User.findOne({
                email
            });
            //if no user
            if(!user){
                next(createError(
                    409, 
                    "Email is invalid")
                ); 
            }
            //if user exist
            if(user){
                //generate access-token
                const access_token = await jwt.sign(
                    {user: user}, 
                    process.env.PRIVATE_KEY
                );
                //preparing redirect url
                const myURL = new URL('http://localhost:3000/auth/new-password/'+user._id+'/'+access_token);

                const transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                    user: process.env.EMAIL,
                    pass: process.env.EMAIL_PASS,
                    }
                });

                var mailOptions = {
                    from: process.env.EMAIL,
                    to: email,
                    subject: 'Account Activation',
                    html: `
                        <h2>Use this link to reset your password</h2>
                        <p>${myURL.href}</p>`
                };
                transporter.sendMail(mailOptions, function(error, info){
                    if (error) {
                        next(createError(
                            409, 
                            "Error when sending the email")
                        ); 
                    } else {
                        res.status(200).send({
                            error: false,
                            message: "Email send successfully"
                        });
                    }
                });
            }

        } catch (error){
            next(createError(
                422, 
                error.message)
            );
            next(error);
        }

    },

    /**
     * Set new password
     * Arguments: {user_id, access_token}
     * Body: {password} 
     */
    setNewPassword: async (req, res, next) => {
        const id = req.params.id;
        const token = req.params.token;
        const password = req.body.password;

        if(!password){
            next(createError(
                    404,
                    "Password must be provided"
                )
            );
        }
        if(password){
            jwt.verify(token, process.env.PRIVATE_KEY, (err, verifiedJwt) => {
                if(err){
                    next(createError(
                        400, 
                        "Token is invalid"
                ));
                }else{
                    try{
                        const salt = Bcrypt.genSaltSync(10);
                        newPassword = Bcrypt.hashSync(
                            password, 
                            salt
                        );
                        const updates = {
                            "password": newPassword
                        }; 
                        const options = { 
                            new: true
                        };
                        User.findByIdAndUpdate(
                            id, 
                            updates,
                            options)
                            .exec(function (err, result){    
                                res.status(200)
                                    .send({
                                        error: false,
                                        message: "Password reset successfully"
                                    });
                            });
                    } catch (error) {
                        if(error instanceof mongoose.CastError) {
                            next(createError(400, "User Id is invalid"));
                            return;
                        }
                        next(error);
                    }
                }
            });
        }
    }

}