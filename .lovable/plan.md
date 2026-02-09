

# 🌳 Family Tree App — "Roots & Branches"

A hybrid public/private family tree platform with interactive visualization, role-based access, and full profile management.

---

## 1. Authentication & User Management
- Sign up / login with email (via Lovable Cloud auth)
- User profile with display name and avatar
- Protected routes for private content

## 2. Database & Data Model
- **Families** table: family name, description, public/private toggle
- **Persons** table: first name, last name, gender, birth/death dates, bio, photo URL, privacy flag per person
- **Relationships** table: linking two persons with type (parent, spouse)
- **Family Roles** table: user-to-family role mapping (admin, editor, viewer) — controls who can edit
- Row-Level Security (RLS) policies enforcing public vs. private access and role-based editing

## 3. Public View (No Login Required)
- Browse public family trees
- See tree structure with first names, last names, gender, and relationship connections
- Private details (dates, photos, bios) are hidden
- Clean, read-only interactive tree visualization

## 4. Private View (Login Required)
- Full person profiles with all details: dates, places, bio, photos
- View restricted to users who belong to the family (viewer, editor, or admin)

## 5. Interactive Family Tree Visualization
- Tree/hierarchy layout rendered with D3.js
- Zoom, pan, and pinch support for mobile
- Click/tap a person to open their profile card
- Visual distinction between generations and relationship types
- Responsive: works fullscreen on mobile with gesture support

## 6. Person Profile Pages
- Detailed profile view: photo, full name, dates, bio, relationships
- Shows parents, children, spouse, and computed relationships (siblings)
- Photo display from Lovable Cloud storage

## 7. Editing & Management (Admin/Editor)
- Add new person (with relationship: child, parent, or spouse of existing person)
- Edit person details and upload photos
- Define/edit relationships between people
- Family settings: rename family, toggle public/private
- Admin can invite users and assign roles (admin, editor, viewer)

## 8. Family Dashboard
- Overview of your families
- Create a new family tree
- Quick stats: number of members, generations
- Switch between families

## 9. Design & UX — Modern & Bold
- Strong accent colors with dark/light mode support
- Bold typography with clear hierarchy
- Card-based layouts for profiles
- Smooth animations and transitions
- Mobile-first responsive design with bottom navigation on small screens
- Full-screen tree view with floating controls

## 10. File Storage
- Photo uploads stored in Lovable Cloud storage buckets
- Profile photos and family documents
- Secure access based on family membership

