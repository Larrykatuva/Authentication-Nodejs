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
                req.body.password = Bcrypt.hashSync(req.body.password, 10);
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
                    console.log(access_token);

                    //preparing redirect url
                    const myURL = new URL('http://localhost:3000/auth/activate/'+result._id+'/'+access_token);
                    console.log(myURL.href);

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
                        console.log('Email sent: ' + info.response);
                        }
                    });

                    res.send(result);
                }


            }
            else{
                //Generating access token
                const access_token = await jwt.sign(req.body, process.env.PRIVATE_KEY);
                console.log(access_token);

                //preparing redirect url
                const myURL = new URL('http://localhost:3000/auth/activate/'+access_token);
                console.log(myURL.href);
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

        try{
            const user = await User.findById(id);
            if(!user){
                throw createError(404, 'User does not exist');
            }else{
                jwt.verify(token, process.env.PRIVATE_KEY, (err, verifiedJwt) => {
                    if(err){
                        next(createError(400, "Token is invalid"));
                    }else{
                        user.is_verified = true;
                        const updates = user;
                        const options = { new: true};
                        const result = User.findByIdAndUpdate(id, updates, options);
                        res.send(result);
                    }
                });
            }

        } catch (error) {
            if(error instanceof mongoose.CastError) {
                next(createError(400, "User Id is invalid"));
                return;
            }
            next(error);
        }
    }
}