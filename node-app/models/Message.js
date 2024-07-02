const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  content: String,
  type: { type: String },
  date: Date,
  visibility: { type: Boolean, default: true } ,

  //reported: { type: Number, default: 0 } ,
  vuByUser: { type: Boolean, default: false },
  reported:  [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      date: { type: Date, default: Date.now },
      status: { type: String, enum: ['O', 'N'], default: 'N' },
      reason: { type: String,  },
    }
  ] 


});

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
