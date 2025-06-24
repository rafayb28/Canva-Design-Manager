[**Live Demo »**](https://your-live-demo-url-here.com)

[<img src="./path-to-your/screenshot-or-gif.gif" alt="Design Manager Application Screenshot">](https://your-live-demo-url-here.com)

# Design Manager

A professional, modern web app for managing your Canva designs and folders with full OAuth integration, subfolder support, and a beautiful, responsive UI.

## Motivation

Canva is an excellent tool for content creation, but for power users, freelancers, and teams managing hundreds of designs, its native organizational tools can become a significant bottleneck. Finding specific assets can be time-consuming and frustrating. `Design Manager` was built to solve this problem by providing a dedicated, professional-grade interface for organizing, locating, and managing Canva assets at scale.

## Tech Stack

- **Frontend:** React, TypeScript, Material-UI (MUI)
- **Backend:** Node.js, Express
- **API Integration:** Canva Connect API, OAuth 2.0 PKCE
- **Development Workflow:** Concurrently

---

## Features

- **OAuth Authentication** with Canva
- **Folder & Subfolder Management** (create, delete, organize)
- **Design Management** (view, move, remove designs)
- **Recursive Design Counts** (parent folders show total designs in all descendants)
- **Responsive, Modern UI** (inspired by Canva)
- **Real-time Updates** (no page reloads needed)
- **Robust Error Handling**

---

## Quick Start

1.  **Clone the Repository**
    ```sh
    git clone <your-repo-url>
    cd <your-repo-directory>
    ```

2.  **Create a Canva Integration**
    - Go to the [Canva Developer Portal](https://www.canva.com/developers/)
    - Create a new app/integration
    - Add the required redirect URLs (e.g., 'http://127.0.0.1:3001/oauth/callback' for URL1)
    - Allow all permissions under the scopes tab
    - Copy your **Client ID** and **Client Secret**

3.  **Install Dependencies** (This installs for both frontend and backend)
    ```sh
    npm install
    ```

4.  **Configure Environment**
    - Navigate to the backend: `cd backend`
    - Create the environment file: `cp .env.example .env`
    - Open `.env` and fill in your Canva API credentials:
      ```
      CANVA_CLIENT_ID=your_client_id_here
      CANVA_CLIENT_SECRET=your_client_secret_here
      CANVA_REDIRECT_URI=http://localhost:3000
      # ... any other required variables
      ```

5.  **Launch the Application**
    - Navigate back to the root directory: `cd ..`
    - Run the `dev` script to start both servers concurrently:
    ```sh
    npm run dev
    ```
- The application will be available at `http://localhost:3000`.

---

## Environment Variables
- `CANVA_CLIENT_ID` - Your Canva app client ID
- `CANVA_CLIENT_SECRET` - Your Canva app client secret
- `CANVA_API_BASE_URL` - (default: https://api.canva.com)
- `CANVA_AUTH_BASE_URL` - (default: https://www.canva.com)
- `PORT` - Backend port (default: 3001)
- `FRONTEND_URL` - Frontend URL (default: http://localhost:3000)

---

## Usage
- **Login** with your Canva account
- **Create folders and subfolders** to organize your designs
- **Move designs** between folders
- **Select a parent folder** to see all designs in it and its subfolders
- **Design counts** in the sidebar reflect all nested designs
- **Fully responsive**: works on desktop, tablet, and mobile

---

## Contributing
- Fork the repo and create a feature branch
- Follow the existing code style and structure
- Submit a pull request with a clear description
- For major changes, open an issue first to discuss

---

## License
MIT
