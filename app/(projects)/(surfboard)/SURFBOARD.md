# Surfboard Geospatial Intelligence Platform

## Executive Summary

Surfboard is a modern geospatial intelligence platform designed for surveyors, planners, and land administrators to unlock the full value of recurrent cadastral and geospatial datasets. By blending user-friendly design with robust GIS capabilities, Surfboard transforms raw survey data into actionable insights, clear visualizations, and structured land intelligence.

Surfboard empowers professionals to:

- Manage and synchronize recurrent survey submissions
- Visualize and query historical and current survey plans and parcel boundaries
- Protect Survey Plans using SP-Code Technology for verification
- Derive strategic insights from aggregated spatial datasets

## Core Modules

1. **Smart Form**: Guided, dynamic form for survey plan uploads, including CSV import, attribute entry, and file uploads (PDF, CAD).
2. **Survey Plan Viewer**: Interactive map viewer for visualizing, searching, and filtering survey plans and parcel boundaries.
3. **Dashboard**: Central hub for users to view recent activity, manage plans, and access analytics.
4. **SP-Code Verification**: QR code generation and public verification portal for each survey plan.

## Core Features

- User management (Surveyors, Admins)
- Dashboard with recent uploads/edits
- Survey upload with CSV, map preview, and attribute entry
- All Survey Plans: list, search, filter, and edit (geometry/attributes)
- SP-Code (QR) verification and public portal
- Map viewer (ArcGIS JS API + Google Maps API)
- Plan sharing (with user ID)
- Shared plans map/list
- File upload and download (PDF, CAD)

## Technical Stack

- **Frontend**: Next.js (React), Tailwind CSS, ArcGIS JS API, Google Maps API
- **Backend**: Node.js (Express), PostgreSQL + PostGIS, Multer (file uploads)
- **Database**: PostgreSQL with PostGIS spatial extensions
- **File Storage**: Local (dev) or S3 (prod)

## Database Schema (Postgres + PostGIS)

- **parcels**: Stores survey plan polygons, attributes, file paths, audit fields
- **pillars**: Stores individual pillar points for each parcel
- **Triggers**: Auto-compute area, centroid, and audit timestamps
- **Spatial Indexes**: For fast map queries

## Frontend Architecture

- Modular Next.js app with project-based routing
- Dashboard: Home, All Plans, Upload, Map Viewer, SP-Code Verification, Shared Plans
- Survey Upload Form: CSV import, ArcGIS map, attribute entry, file upload
- All Plans: Table/list with search, filter, and edit
- Map Viewer: Interactive map with spatial queries
- SP-Code Verification: QR code generation and public verification page

## Backend Architecture

- Express server with REST API endpoints:
  - `/submit`: Accepts survey uploads (geometry, attributes, files)
  - `/plans`: List/search/filter all plans
  - `/plan/:id`: Get/edit plan details
  - `/verify/:spcode`: Public verification endpoint
  - `/facilitators`: List/add facilitators
- File upload handling (PDF, CAD)
- PostGIS queries for spatial operations

## Development Roadmap

1. **Project Setup**
   - Scaffold Next.js frontend and Express backend
   - Set up PostgreSQL + PostGIS database
2. **Core Features**
   - Survey Upload Form (CSV, map, attributes, file upload)
   - Dashboard Home (recent uploads/edits)
   - All Survey Plans (list/search/filter/edit)
   - Map Viewer (ArcGIS/Google Maps integration)
   - SP-Code Verification (QR, public portal)
3. **Advanced Features**
   - Plan sharing and shared plans view
   - User authentication and roles
   - Analytics and reporting
   - File storage integration (S3)
4. **Testing & QA**
   - Unit and integration tests
   - User acceptance testing
5. **Deployment**
   - Production deployment (Vercel/Netlify for frontend, cloud for backend)
   - Database and file storage setup

## Notes

- The platform is designed for extensibility and can be adapted for other geospatial workflows.
- Security, audit logging, and data integrity are prioritized throughout the stack.

---

For further details, see the codebase and individual module documentation.
