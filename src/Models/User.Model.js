const mongoose = require('mongoose');
require('mongoose-type-email');
const Schema = mongoose.Schema;


const UserSchema = new Schema({
    user_id: {
        type: String,
        primaryKey: true,
        autoIncrement: true,
    },
    username: {
        type: String,
        required: true
    },
    email: {
        type: mongoose.SchemaTypes.Email
    },
    password: {
        type: String
    },
    is_verified: {
        type: Boolean,
        default: false
    },
    is_active: {
        type: Boolean,
        default: false
    },
    date: { type: Date, default: Date.now }
});

const User = mongoose.model('user', UserSchema);
module.exports = User;