import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const MONGO_URI = 'mongodb+srv://vermasuraj7881_db_user:rrrbh7nEVrb6zkIu@cluster0.mqy0swz.mongodb.net/?appName=Cluster0';

async function check() {
  try {
    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;
    const user = await db.collection('users').findOne({ email: 'suraj@gmail.com' });
    
    if (!user) {
      console.log('User suraj@gmail.com NOT FOUND in database.');
    } else {
      console.log('User found! Details:', { ...user, password: '<hashed>' });
      
      // Let's force reset the password to "123456" just in case they forgot it or it was hashed wrong
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('123456', salt);
      await db.collection('users').updateOne({ email: 'suraj@gmail.com' }, { $set: { password: hashedPassword } });
      console.log('Successfully reset password for suraj@gmail.com to: 123456');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

check();
