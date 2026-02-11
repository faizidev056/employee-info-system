# Mileage Report to Vehicle Attendance Workflow

## Overview
A new feature has been added to automatically push mileage report data to the Vehicle Attendance system, ensuring that vehicles with recorded mileage are automatically marked as present.

## How It Works

### 1. **Data Flow**
```
Mileage Report (Dual Sources)
    ├── Daily Reports (manual upload)
    └── Vehicle Records (from database)
           ↓
    Push Attendance Button
           ↓
    Vehicle Attendance Database
           ↓
    Vehicle Attendance Page
```

### 2. **Features**

#### **Push Attendance Button**
- Located on the Mileage Report page
- Button style: Indigo to Purple gradient
- Icon: Document/clipboard icon
- States:
  - **Disabled**: When no mileage data exists
  - **Active**: When mileage data is present
  - **Loading**: Shows spinner when pushing data

#### **Workflow Steps**
1. **Upload or enter mileage data** in the Mileage Report
2. **Review the data** (ensure vehicle codes are present)
3. **Click "Push Attendance"** button
4. System will:
   - Extract unique vehicle registration numbers from mileage data
   - Match them against registered vehicles in the database
   - Create attendance records for today's date
   - Mark all vehicles with mileage as "Present"
   - Store in `vehicle_attendance` table

### 3. **Success/Error Notifications**

#### **Success Notification**
- Green glassmorphic banner
- Shows number of vehicles marked present
- Auto-dismisses after 5 seconds
- Example: "Attendance pushed successfully! 15 vehicle(s) marked as present for 2026-02-11"

#### **Error Scenarios**
- **No mileage data**: "No mileage data to push - Please load or enter mileage data first"
- **No vehicle codes**: "No vehicle codes found - Mileage data must contain vehicle codes (reg_no)"
- **Vehicle mismatch**: "No matching vehicles found - The vehicle codes in mileage report do not match registered vehicles"
- **Database error**: Shows the specific error message

### 4. **Database Schema**

#### **vehicle_attendance Table**
```sql
CREATE TABLE vehicle_attendance (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER REFERENCES vehicle_registrations(id),
    attendance_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL, -- 'Present', 'Absent', 'Maintenance'
    updated_at TIMESTAMP,
    UNIQUE(vehicle_id, attendance_date)
);
```

### 5. **Benefits**

✅ **Automated Tracking**: No need to manually mark attendance for vehicles with mileage data
✅ **Data Consistency**: Ensures mileage and attendance records are synchronized
✅ **Time Saving**: Reduces manual data entry effort
✅ **Active Vehicle Detection**: Automatically identifies which vehicles are operational
✅ **Easy Verification**: Can cross-reference mileage with attendance in Vehicle Registration feature

### 6. **Usage Example**

1. Go to **Daily Report → Mileage Report**
2. Upload your mileage report Excel file or paste data
3. Verify the data shows vehicle codes (reg_no column)
4. Click **"Push Attendance"** button
5. Wait for success notification
6. Navigate to **Vehicle Registration → Attendance** tab
7. Select today's date
8. See all vehicles from mileage report marked as "Present"

### 7. **Important Notes**

⚠️ **Vehicle Matching**: Vehicle codes (reg_no) in mileage report must match registered vehicles
⚠️ **Date**: Attendance is pushed for today's date (matching the mileage report date)
⚠️ **Upsert Logic**: If attendance already exists for a vehicle on that date, it will be updated
⚠️ **Status Override**: Vehicles marked manually in attendance can be overridden by push operation

### 8. **UI Enhancements**

#### **Mileage Report**
- New "Push Attendance" button with gradient styling
- Notification banner for success/error messages
- Visual feedback during push operation

#### **Vehicle Attendance**
- Updated with glassmorphism styling
- Shows all active vehicles
- Can be manually adjusted even after push
- Date selector for viewing different dates

## Technical Implementation

### **Frontend Components Modified**
- `MileageReport.jsx`: Added push button and notification system
- `VehicleAttendance.jsx`: Enhanced styling with glassmorphism

### **Database Operations**
- **Read**: Fetches vehicle IDs from `vehicle_registrations`
- **Upsert**: Uses `onConflict` to update existing attendance or insert new

### **Error Handling**
- Validates data before pushing
- Provides clear error messages
- Doesn't break existing functionality on errors
