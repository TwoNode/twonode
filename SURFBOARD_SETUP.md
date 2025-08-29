# Surfboard Plan Creation System

This document provides a comprehensive guide to the Surfboard Plan Creation System, which allows users to create, manage, and view survey plans with geographic data.

## Features

- **Plan Creation**: Upload CSV files with pillar coordinates and create survey plans
- **File Management**: Support for PDF, CAD, and certificate file uploads to AWS S3
- **Map Visualization**: Interactive map preview using Leaflet
- **Coordinate Conversion**: Automatic conversion from local projection to WGS84
- **Status Management**: Track plan status (Pending, Under Review, Approved, Rejected)
- **Database Storage**: PostgreSQL with PostGIS for spatial data
- **Cloud Storage**: AWS S3 for secure file storage

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 12+ with PostGIS extension
- Next.js 14+ project setup
- AWS S3 bucket and credentials

## Installation

### 1. Install Dependencies

```bash
npm install leaflet @types/leaflet @aws-sdk/client-s3
```

### 2. Database Setup

The system uses the existing Prisma schema with the following models:

- `SurfboardPlan`: Main plan information
- `SurfboardPillar`: Individual pillar coordinates
- `SurfboardUser`: User management
- `SurfboardNotification`: Notification system

### 3. AWS S3 Configuration

Add the following environment variables to your `.env` file:

```env
# AWS S3 Configuration for Surfboard
SURFBOARD_AWS_REGION=your-aws-region
SURFBOARD_AWS_ACCESS_KEY_ID=your-access-key
SURFBOARD_AWS_SECRET_ACCESS_KEY=your-secret-key
SURFBOARD_AWS_BUCKET_NAME=your-bucket-name

# Fallback to REVA AWS config if Surfboard config is not provided
REVA_AWS_REGION=your-aws-region
REVA_AWS_ACCESS_KEY_ID=your-access-key
REVA_AWS_SECRET_ACCESS_KEY=your-secret-key
REVA_AWS_BUCKET_NAME=your-bucket-name
```

### 4. Environment Variables

Ensure your `.env` file includes:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/database_name"
```

## Usage

### Creating a New Plan

1. Navigate to `/surfboard/dashboard/newplan`
2. Fill in the plan information:
   - Plan Number (required)
   - Survey Title (required)
   - Plan Type (required)
   - Deeded Area (required)
   - Facilitator (required)
   - Pillar Type (required)
   - Certificate Ready (optional)

3. Upload files:
   - **CSV File**: Required format with headers `PillarNumber,Easting,Northing`
   - **PDF File**: Optional survey document (uploaded to S3)
   - **CAD File**: Optional CAD drawing (uploaded to S3)
   - **Certificate File**: Optional if certificate is ready (uploaded to S3)

4. The system will:
   - Parse the CSV file
   - Convert coordinates to WGS84
   - Generate polygon geometry
   - Calculate area
   - Upload files to AWS S3
   - Store all data in the database

### CSV File Format

The CSV file must have the following format:

```csv
PillarNumber,Easting,Northing
P1,500000,1000000
P2,500100,1000000
P3,500100,999900
P4,500000,999900
```

### Viewing Plans

1. Navigate to `/surfboard/dashboard/plans`
2. View all created plans in a table format
3. Update plan status using the dropdown
4. Delete plans (with confirmation) - this also deletes associated S3 files
5. View individual plan details

## File Structure

```
app/(projects)/(surboard)/
├── actions/
│   ├── surfboardActions.ts          # Server actions for plan management
│   └── awsActions.ts                # AWS S3 file operations
├── surfboard/dashboard/
│   ├── newplan/
│   │   ├── CreateSurfBoardPlan.tsx  # Main form component
│   │   ├── MapPreview.tsx           # Map visualization component
│   │   └── page.tsx                 # New plan page
│   └── allplans/
│       ├── PlanList.tsx             # Plan list component
│       └── page.tsx                 # All plans page
```

## API Endpoints

The system uses Next.js Server Actions instead of traditional API routes:

### Server Actions

- `createSurfboardPlan()`: Create a new plan with files uploaded to S3
- `getAllSurfboardPlans()`: Fetch all plans
- `getSurfboardPlanById()`: Get a specific plan
- `updateSurfboardPlanStatus()`: Update plan status
- `deleteSurfboardPlan()`: Delete a plan and associated S3 files

### AWS S3 Functions

- `uploadSurfboardFileToS3()`: Upload single file to S3
- `uploadMultipleSurfboardFilesToS3()`: Upload multiple files to S3
- `deleteSurfboardFileFromS3()`: Delete single file from S3
- `deleteMultipleSurfboardFilesFromS3()`: Delete multiple files from S3

### Helper Functions

- `parseCSVContent()`: Parse CSV pillar data
- `convertCoordinates()`: Convert local coordinates to WGS84
- `generatePolygonFromPillars()`: Create GeoJSON polygon
- `generatePointFromPillar()`: Create GeoJSON point

## Coordinate System

The system currently uses a simplified coordinate conversion for Nigeria Mid Belt (EPSG:26331) to WGS84. In production, you should:

1. Install a proper projection library (e.g., `proj4js`)
2. Update the `convertCoordinates()` function
3. Add support for multiple coordinate systems

## File Storage (AWS S3)

Files are stored in AWS S3 with the following structure:

```
surfboard/
├── {planNumber}/
│   ├── pdf/
│   │   └── {timestamp}-{filename}.pdf
│   ├── cad/
│   │   └── {timestamp}-{filename}.dwg
│   └── certificate/
│       └── {timestamp}-{filename}.pdf
```

### S3 File Organization

- **PDF files**: `surfboard/{planNumber}/pdf/`
- **CAD files**: `surfboard/{planNumber}/cad/`
- **Certificate files**: `surfboard/{planNumber}/certificate/`

### File Metadata

Each uploaded file includes metadata:
- `originalName`: Original filename
- `fileType`: Type of file (pdf, cad, certificate)
- `planNumber`: Associated plan number
- `uploadedAt`: Upload timestamp

## Map Visualization

The system uses Leaflet for map visualization:

- Interactive map with OpenStreetMap tiles
- Polygon display for survey boundaries
- Pillar markers with popups
- Automatic bounds fitting

## Error Handling

The system includes comprehensive error handling:

- CSV parsing validation
- File upload validation (S3)
- Database error handling
- User-friendly error messages
- Toast notifications for feedback
- S3 upload failure recovery

## Security Considerations

- File type validation
- File size limits (10MB)
- Input sanitization
- Database parameterized queries
- User authentication (integrate with existing auth system)
- AWS IAM permissions for S3 access
- Secure file URLs with proper access controls

## Performance Optimization

- Lazy loading of map components
- Efficient database queries with proper indexing
- File upload progress indicators
- Pagination for large datasets
- S3 multipart uploads for large files
- CDN integration for file delivery

## Testing

Create a test CSV file:

```csv
PillarNumber,Easting,Northing
P1,500000,1000000
P2,500100,1000000
P3,500100,999900
P4,500000,999900
P5,499900,999900
P6,499900,1000000
```

## Troubleshooting

### Common Issues

1. **Map not loading**: Check if Leaflet CSS is imported
2. **S3 upload fails**: Verify AWS credentials and bucket permissions
3. **Coordinate conversion errors**: Check CSV format
4. **Database errors**: Verify Prisma schema and migrations
5. **File access denied**: Check S3 bucket CORS settings

### AWS S3 Setup

1. **Create S3 Bucket**:
   ```bash
   aws s3 mb s3://your-surfboard-bucket
   ```

2. **Configure CORS** (if needed):
   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
       "AllowedOrigins": ["*"],
       "ExposeHeaders": []
     }
   ]
   ```

3. **Set up IAM User** with S3 permissions:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "s3:PutObject",
           "s3:GetObject",
           "s3:DeleteObject",
           "s3:ListBucket"
         ],
         "Resource": [
           "arn:aws:s3:::your-surfboard-bucket",
           "arn:aws:s3:::your-surfboard-bucket/*"
         ]
       }
     ]
   }
   ```

### Debug Mode

Enable debug logging in the server actions by setting:

```typescript
const prisma = new PrismaClient({
  log: ["query", "info", "warn", "error"],
});
```

## Future Enhancements

- [ ] Advanced coordinate system support
- [ ] S3 lifecycle policies for file management
- [ ] Real-time collaboration features
- [ ] Advanced map editing capabilities
- [ ] Export functionality (PDF, Shapefile)
- [ ] Bulk import/export
- [ ] Advanced search and filtering
- [ ] Mobile-responsive design improvements
- [ ] Integration with external GIS services
- [ ] Automated area calculation validation
- [ ] S3 versioning for file history
- [ ] CloudFront CDN integration

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review the error logs
3. Verify database connectivity
4. Test with sample data
5. Check AWS S3 bucket permissions and configuration

## License

This system is part of the main project and follows the same licensing terms. 