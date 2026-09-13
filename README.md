CloudDoc — Cloud-Native Document Management System

CloudDoc is a cloud-native document management platform built using AWS serverless services. It securely stores documents, tracks their metadata and upload status, and uses event-driven processing without requiring a continuously running traditional server.

Problem Statement

As the number of digital documents grows, applications need a reliable and scalable way to store, manage, and track files.

Traditional applications may depend on continuously running backend servers to handle file uploads and processing. This can increase infrastructure management and make scaling more difficult.

CloudDoc addresses this problem by using cloud storage, serverless computing, and event-driven architecture to automate document management.

Proposed Solution

CloudDoc provides a web-based platform where users can upload, view, search, and download documents.

The system uses Amazon S3 for file storage and Amazon DynamoDB for document metadata. AWS Lambda handles backend operations and automatically processes S3 upload events.

How it works

1. The user selects a document through the web application.
2. The application sends the file name and content type to the backend.
3. AWS Lambda generates a temporary pre-signed S3 upload URL.
4. The browser uploads the document directly to Amazon S3.
5. Amazon S3 generates an `ObjectCreated` event.
6. The event automatically triggers AWS Lambda.
7. Lambda updates the document status and metadata in DynamoDB.
8. The dashboard retrieves document information from DynamoDB.
9. Users can search for documents and generate temporary download URLs.

This architecture reduces dependence on continuously running servers and enables event-driven cloud processing.

Architecture

                         ┌─────────────────────────┐
                         │          User           │
                         │      Web Application    │
                         └────────────┬────────────┘
                                      │
                                      │ POST /upload
                                      ▼
                         ┌─────────────────────────┐
                         │      API Gateway        │
                         └────────────┬────────────┘
                                      │
                                      ▼
                         ┌─────────────────────────┐
                         │       AWS Lambda        │
                         │    CloudDocProcessor    │
                         └────────────┬────────────┘
                                      │
                              Pre-signed URL
                                      │
                                      ▼
                         ┌─────────────────────────┐
                         │       Browser           │
                         │   Direct S3 Upload      │
                         └────────────┬────────────┘
                                      │
                                      │ PUT
                                      ▼
                         ┌─────────────────────────┐
                         │       Amazon S3          │
                         │    Document Storage      │
                         └────────────┬────────────┘
                                      │
                             ObjectCreated Event
                                      │
                                      ▼
                         ┌─────────────────────────┐
                         │       AWS Lambda        │
                         │    Event Processing     │
                         └────────────┬────────────┘
                                      │
                                      ▼
                         ┌─────────────────────────┐
                         │      Amazon DynamoDB    │
                         │   Document Metadata     │
                         └─────────────────────────┘

> Note:The current prototype uses a single Lambda function, `CloudDocProcessor`, to handle API operations and S3 event processing. The architecture can be further modularized into separate Lambda functions as a future enhancement.

Key Features

* Secure cloud document storage
* Direct browser-to-S3 uploads
* Pre-signed upload URLs
* Event-driven document processing
* Automatic document status tracking
* Document metadata storage
* Searchable document dashboard
* Temporary download URLs
* Upload progress tracking
* File type validation
* 10 MB upload limit
* Responsive web interface
* Serverless backend architecture
* Cloud-based document management

AWS Services Used

| AWS Service            | Purpose                                            |
| ---------------------- | -------------------------------------------------- |
| **Amazon S3**          | Stores uploaded documents                          |
| **AWS Lambda**         | Handles backend operations and S3 event processing |
| **Amazon API Gateway** | Provides HTTP API endpoints                        |
| **Amazon DynamoDB**    | Stores document metadata and upload status         |
| **AWS IAM**            | Controls permissions between AWS services          |
| **Amazon CloudWatch**  | Provides Lambda execution logs and monitoring      |

Technology Stack

Frontend

* HTML5
* CSS3
* JavaScript
* Responsive Web Design

Backend

* Python
* AWS Lambda
* Amazon API Gateway

Cloud Infrastructure

* Amazon S3
* Amazon DynamoDB
* AWS IAM
* Amazon CloudWatch

API Endpoints

Upload Document

POST /upload

Generates a temporary pre-signed S3 upload URL and creates the initial document metadata record in DynamoDB.

List Documents

GET /documents

Retrieves document metadata from DynamoDB for displaying the document dashboard.

Download Document

GET /download?documentId=<document-id>

Generates a temporary S3 download URL for the requested document.

Upload Workflow

Select File
     ↓
Client-side Validation
     ↓
POST /upload
     ↓
AWS Lambda
     ↓
Generate Pre-signed S3 URL
     ↓
Browser uploads directly to S3
     ↓
S3 ObjectCreated Event
     ↓
AWS Lambda Event Processor
     ↓
Update DynamoDB
     ↓
Status → Uploaded
     ↓
Dashboard Refresh

Why Serverless?

CloudDoc uses AWS serverless services instead of depending on a continuously running traditional backend server.

AWS manages the underlying infrastructure while Lambda executes code in response to API requests and S3 events.

Benefits

* Automatic scaling
* Reduced infrastructure management
* Event-driven execution
* Better resource utilization
* Pay-per-use cloud model
* Easy integration with managed AWS services

Direct-to-S3 Upload

One of the key design decisions in CloudDoc is that the browser does not send the actual document through Lambda.

Instead:

Browser
   ↓
API Gateway
   ↓
Lambda
   ↓
Pre-signed URL
   ↓
Browser ─────────→ Amazon S3

The backend generates a temporary URL, and the browser uploads the file directly to S3.

This reduces unnecessary backend data transfer and makes the upload architecture more suitable for scaling.

Event-Driven Processing

CloudDoc uses an Amazon S3 `ObjectCreated` event to trigger AWS Lambda automatically after a document is uploaded.

Document Uploaded
       ↓
Amazon S3
       ↓
ObjectCreated Event
       ↓
AWS Lambda
       ↓
DynamoDB
       ↓
Status Updated

This means the document processing step does not need to be continuously running or manually triggered.

Scalability

CloudDoc is designed using managed AWS services that can scale with increasing workloads.

* **Amazon S3** provides scalable object storage.
* **AWS Lambda** executes backend logic in response to requests and events.
* **Amazon DynamoDB** provides managed NoSQL storage for document metadata.
* **API Gateway** provides a managed HTTP interface.

The serverless architecture reduces the need to manually manage server capacity as application demand changes.

Security

CloudDoc implements several security measures:

* S3 Block Public Access enabled
* IAM-based permissions
* Private S3 bucket
* Temporary pre-signed upload URLs
* Temporary pre-signed download URLs
* No AWS credentials stored in frontend code
* File type validation
* 10 MB file size limit
* AWS-managed infrastructure

Pre-signed URLs provide temporary access to S3 objects without exposing AWS credentials to the browser.

> Current prototype note:Authentication and user-specific document authorization are planned as future enhancements. The current prototype is intended for demonstration purposes.

Monitoring

AWS CloudWatch is used to monitor Lambda execution and inspect application logs.

This helps with:

* Debugging Lambda executions
* Monitoring API operations
* Investigating S3 event processing
* Detecting backend errors

Project Structure

CloudDoc/
│
├── index.html
├── style.css
├── script.js
└── README.md

Current Prototype

The current CloudDoc prototype supports:

* Document upload
* Direct S3 file storage
* Automatic S3 event triggering
* DynamoDB metadata tracking
* Upload status tracking
* Document search
* Document listing
* Secure temporary downloads
* Upload progress display
* File validation
* Responsive user interface

Future Enhancements

The platform can be extended with:

Authentication

* Amazon Cognito user authentication
* User-specific document access
* Role-based authorization

Intelligent Document Processing

* Automatic document classification
* Text extraction
* Document summarization
* OCR using Amazon Textract
* Intelligent metadata generation

Advanced Cloud Architecture

* Separate Lambda functions for upload, listing, downloading, and processing
* Amazon SQS for asynchronous processing
* Amazon EventBridge for event routing
* CloudWatch dashboards and alarms
* CI/CD deployment pipeline

 ocument Management

* Document versioning
* Folder organization
* Advanced search and filtering
* Document sharing
* Multi-user collaboration
* Usage analytics

Impact

CloudDoc demonstrates how a traditional document management workflow can be redesigned using cloud-native technologies.

By combining:

Serverless Computing
        +
Object Storage
        +
Managed NoSQL Database
        +
HTTP APIs
        +
Event-Driven Processing

CloudDoc provides a scalable foundation for modern cloud-based document management.

Hackathon Track

Cloudforge

Track: Software, Web & Cloud

Problem Statement: PS07

> Develop a scalable application using cloud services, serverless architecture, containers, microservices, or event-driven systems.

CloudDoc addresses PS07 through its use of:

* AWS serverless architecture
* Amazon S3
* AWS Lambda
* API Gateway
* DynamoDB
* Event-driven S3 processing

Demo

Live Demo

*Add live deployment link here.*

Demo Video

*Add demonstration video link here.*

Screenshots

*Add application screenshots here.*

Author

Tharani V

B.Tech Information Technology
Sri Eshwar College of Engineering


Built With

AWS · Python · JavaScript · HTML · CSS · Serverless Architecture
