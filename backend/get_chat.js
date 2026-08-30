import mongoose from 'mongoose';
import User from './src/models/user.model.js';
import Conversation from './src/models/conversation.model.js';
import Message from './src/models/message.model.js';
import connectDB from './src/config/db.js';

import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await connectDB();
  
  const user1 = await User.findOne({ email: 'rohit@gmail.com' });
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
  
  const messages = await Message.find({ conversationId: convo._id })
    .populate('sender', 'name')
    .sort({ createdAt: 1 });
    
  console.log(`Found ${messages.length} messages.\n`);
  
  for (const msg of messages) {
    const time = msg.createdAt.toLocaleString();
    console.log(`[${time}] ${msg.sender.name}: ${msg.text}${msg.imageUrl ? ` [Image: ${msg.imageUrl}]` : ''}`);
  }
  
  process.exit(0);
}

run();
