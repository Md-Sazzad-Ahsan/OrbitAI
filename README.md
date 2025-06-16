# OrbitAI - Modern Web Application

A modern web application built with Next.js 13+ (App Router), NextAuth.js, and TailwindCSS.

## Features

- 🎨 Modern and responsive design
- 🔐 Authentication with NextAuth.js
- 🌓 Light/Dark mode support
- 📱 Mobile-friendly layout
- 🎯 Clean and intuitive UI

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/yourusername/OrbitAI.git
cd OrbitAI
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
   - Create a `.env.local` file in the root directory
   - Add the following variables:
     ```
     NEXTAUTH_SECRET=your-secret-here
     NEXTAUTH_URL=http://localhost:3000
     ```
   - Generate a secure secret using: `openssl rand -base64 32`

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

- `/app` - Main application directory
  - `/api` - API routes
  - `/auth` - Authentication pages
  - `/components` - Reusable UI components
  - `layout.js` - Root layout component
  - `page.js` - Home page

## Authentication

The application uses NextAuth.js for authentication. Currently, it supports:
- Email/Password authentication (development only)
- Session management
- Protected routes

## Styling

This project uses TailwindCSS for styling. The color scheme and design system can be customized in the `tailwind.config.js` file.

## Deployment

1. Build the application:
```bash
npm run build
```

2. Start the production server:
```bash
npm start
```

For production deployment, make sure to set the following environment variables:
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL` (your production URL)

## Tech Stack

- Next.js 13+ (App Router)
- NextAuth.js
- TailwindCSS
- React
- ESLint

## Contributing

Feel free to open issues and pull requests!

## License

MIT
