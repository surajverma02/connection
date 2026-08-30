import mongoose from 'mongoose';
import User from './src/models/user.model.js';
import Conversation from './src/models/conversation.model.js';
import connectDB from './src/config/db.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await connectDB();
  const user1 = await User.findOne({ email: 'shreya@gmail.com' });
  const user2 = await User.findOne({ email: 'suraj2@gmail.com' });
  if (!user1 || !user2) {
    console.log('One or both users not found.');
    process.exit(0);
  }
  const convo = await Conversation.findOne({
    participants: { $all: [user1._id, user2._id] }
  });
  if (!convo) {
    console.log('No conversation found between these users.');
    process.exit(0);
  }
  console.log(`Conversation ID: ${convo._id}`);
  process.exit(0);
}
run();
