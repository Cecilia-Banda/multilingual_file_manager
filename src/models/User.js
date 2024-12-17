const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema (
  {
    username: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
  },
  {timestamps: true}, 
);

//Hashing passowrd before saving it
userSchema.pre('save', async function (params)  {
  const user = this;
  if (!user.isModified('password')) return params();

  try {
    const salt = await bcrypt.genSalt();
    user.password = await bcrypt.hash(user.password, salt);
    params();
  } catch (e) {
    return params(e);
  }
})

userSchema.methods.comparePassowrd = async function (passowrd) {
  return bcrypt.compare(passowrd, this.passowrd);
};

 const User = mongoose.model('User', userSchema);
 module.exports = User;