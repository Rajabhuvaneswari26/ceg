# CEG Connect

A modern social platform for College of Engineering, Guindy students to connect, collaborate, and share within their college community.

## 🚀 Features

### Authentication
- **Email OTP Login**: Secure authentication using CEG email addresses**
- Gmail integration for OTP delivery
- 5-minute OTP expiry
- Firebase custom token generation

### Profile Management
- First-time profile setup (name, registration number, department, year, photo)
- Firebase Storage for profile photos
- Auto-load profile on subsequent logins

### Groups
- Create and join study groups
- Real-time chat with text, images, and file sharing
- Group management (admin controls)
- Private and public groups

### Communities
- Create and follow interest-based communities
- Post with images, videos, and files
- Like and comment system
- Real-time updates

### Feed
- Global feed from followed communities
- Instagram-style post cards
- Trending posts algorithm
- Filter by following/trending

### Notifications
- Real-time notifications for likes, comments, follows
- Mark as read functionality
- Notification history

## 🛠 Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development
- **TailwindCSS** for styling
- **Firebase SDK** for real-time features
- **Zustand** for state management
- **React Router DOM** for navigation
- **Lucide React** for icons

### Backend
- **Node.js** with Express
- **Firebase Admin SDK** for server-side operations
- **Nodemailer** for email services
- **CORS** and **Helmet** for security
- **Rate limiting** for API protection

### Database & Storage
- **Firebase Firestore** for real-time database
- **Firebase Storage** for file uploads
- **Firebase Authentication** for user management

## 📁 Project Structure

```
CEG-Connect/
├── frontend/                 # React + Vite + Tailwind
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/           # Screen components
│   │   ├── store/           # Zustand state management
│   │   ├── firebase.ts      # Firebase configuration
│   │   ├── App.tsx          # Main app component
│   │   └── main.tsx         # Entry point
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
├── backend/                 # Node.js + Express
│   ├── routes/              # API routes
│   │   ├── auth.js          # OTP authentication
│   │   ├── users.js         # User management
│   │   ├── groups.js        # Group functionality
│   │   ├── communities.js   # Community features
│   │   └── posts.js         # Post management
│   ├── index.js             # Server entry point
│   └── package.json
├── assets/                  # Default images and assets
├── env.example              # Environment variables template
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Firebase project
- Gmail account with App Password

### 1. Clone the Repository
```bash
git clone <repository-url>
cd ceg-connect
```

### 2. Backend Setup
```bash
cd backend
npm install
```

Create `.env` file in backend directory:
```env
# Firebase Configuration
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=your-firebase-client-email
FIREBASE_PRIVATE_KEY=your-firebase-private-key

# Gmail Configuration
GMAIL_USER=your-gmail@gmail.com
GMAIL_APP_PASSWORD=your-gmail-app-password

# Server Configuration
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

Start the backend server:
```bash
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install
```

Create `.env` file in frontend directory:
```env
# Firebase Web SDK Configuration
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-firebase-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
VITE_FIREBASE_APP_ID=your-firebase-app-id
```

Start the frontend development server:
```bash
npm run dev
```

### 4. Firebase Setup

1. **Create a Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project
   - Enable Authentication, Firestore, and Storage

2. **Configure Authentication**
   - Enable Email/Password authentication
   - Add your domain to authorized domains

3. **Setup Firestore Database**
   - Create database in production mode
   - Set up security rules (see below)

4. **Setup Storage**
   - Enable Firebase Storage
   - Configure storage rules

5. **Get Service Account Key**
   - Go to Project Settings > Service Accounts
   - Generate new private key
   - Use the credentials in your backend `.env`

### 5. Gmail Setup

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Go to Google Account settings
   - Security > 2-Step Verification > App passwords
   - Generate password for "Mail"
   - Use this password in your backend `.env`

## 🔧 Configuration

### Firestore Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own profile
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Users can read/write their own notifications
    match /users/{userId}/notifications/{notificationId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Groups - members can read/write
    match /groups/{groupId} {
      allow read, write: if request.auth != null && 
        (resource.data.members.hasAny([request.auth.uid]) || 
         request.auth.uid == resource.data.admin);
    }
    
    // Communities - followers can read, members can write
    match /communities/{communityId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        (request.auth.uid == resource.data.admin || 
         request.auth.uid in resource.data.followers);
    }
  }
}
```

### Storage Security Rules
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /profile-photos/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /group-files/{groupId}/{allPaths=**} {
      allow read, write: if request.auth != null;
    }
    
    match /community-posts/{communityId}/{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 📱 Usage

### For Students
1. **Sign Up**: Use your CEG email to receive OTP
2. **Complete Profile**: Add your details and photo
3. **Join Groups**: Connect with classmates and study groups
4. **Follow Communities**: Stay updated with your interests
5. **Share Content**: Post updates, images, and files
6. **Stay Connected**: Real-time notifications and messaging

### For Administrators
- Monitor community activity
- Manage groups and communities
- Handle user reports
- Analytics and insights

## 🔒 Security Features

- **Email OTP Authentication**: Secure login without passwords
- **Firebase Security Rules**: Database and storage protection
- **Rate Limiting**: API protection against abuse
- **CORS Configuration**: Cross-origin request security
- **Input Validation**: Server-side validation for all inputs
- **File Upload Security**: Type and size restrictions

## 🚀 Deployment

### Frontend (Vercel/Netlify)
```bash
cd frontend
npm run build
# Deploy the dist folder
```

### Backend (Railway/Render/Heroku)
```bash
cd backend
# Set environment variables in your hosting platform
# Deploy the backend
```

### Environment Variables for Production
- Set all environment variables in your hosting platform
- Use production Firebase project
- Configure production Gmail account
- Set up custom domain for CORS

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

## 🎯 Future Enhancements

- [ ] Mobile app (React Native)
- [ ] Video calling integration
- [ ] Event management system
- [ ] Assignment sharing
- [ ] Alumni network
- [ ] Advanced analytics
- [ ] Push notifications
- [ ] Multi-language support

---

**Built with ❤️ for College of Engineering, Guindy**

