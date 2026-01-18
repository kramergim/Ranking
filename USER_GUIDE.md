# 🥋 Swiss Judo Ranking System - User Guide

> A comprehensive platform for managing and displaying judo athlete rankings with advanced snapshot capabilities and performance tracking.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Public Features](#public-features)
- [Admin Features](#admin-features)
- [User Roles](#user-roles)

---

## 🎯 Overview

The Swiss Judo Ranking System provides a complete solution for tracking athlete performance, managing rankings, and publishing official snapshots. The platform features real-time calculations, historical snapshots, and detailed athlete profiles.

### Key Highlights

- **📸 Monthly Snapshots** - Freeze rankings at specific points in time
- **🏆 Performance Tracking** - Automatic point calculations with carryover rules
- **👤 Athlete Profiles** - Detailed performance history and statistics
- **📊 Multiple Views** - Rankings by age category, weight, gender, and more
- **🔒 Role-Based Access** - Public, selector, and admin access levels

---

## 🌐 Public Features

### Rankings Overview

**Access:** `/rankings`

The public rankings page displays the latest published snapshot of athlete standings.

**Features:**
- **Age Category Filtering** - View rankings segmented by age groups
- **Search & Filters** - Find athletes by name, club, weight, or gender
- **Real-time Stats** - See current year points, carryover, and total points
- **Snapshot Selection** - Browse historical rankings from previous months

**Visual Elements:**
- Clean, responsive table design
- Swiss red accent colors
- Sortable columns
- Mobile-friendly layout

---

### Athlete Detail Page

**Access:** Click any athlete name from the rankings

**Displays:**

#### 🎨 Hero Section
- **Massive point display** - Total points in large, bold typography
- **Current rank badge** - Position within age category
- **Swiss red gradient** - Professional branding

#### 📸 Identity Section
- **Athlete photo** - Professional headshot (if available)
- **Full name** - Prominent display
- **Club affiliation** - Organization details

#### 📊 Key Statistics Grid
- **Age Category** - Competition classification
- **Weight Category** - Division details
- **Gender** - M/F indicator
- **Performance Hub Level** - Elite status badge (if applicable)

#### 💰 Points Breakdown
- **Current Year Points** - Blue card with points earned this season
- **Previous Year Points** - Gray card showing carryover from last year
- **Carryover Calculation** - Automatic 40% carryover applied to totals

#### 🏅 Competition History
- **Event List** - All tournaments with dates and coefficients
- **Rankings Achieved** - Final positions (1st, 2nd, 3rd, etc.)
- **Points Earned** - Breakdown per competition
- **Calculation Details** - Transparent point calculation explanations

---

## 🔐 Admin Features

### Dashboard

**Access:** `/admin`

Central hub for system administration.

**Quick Actions:**
- Create new snapshots
- Manage athletes
- Add competition results
- View system statistics

---

### Points Overview (Matrix View)

**Access:** `/admin/points-overview`

**The Matrix:** A powerful spreadsheet-like view showing all athletes and competitions in one screen.

**Features:**
- **Athletes as Rows** - All active athletes listed vertically
- **Competitions as Columns** - Up to 20 most recent events displayed horizontally
- **Color-Coded Points** - Instant visual feedback on performance
  - 🟢 Green: 30+ points
  - 🔵 Blue: 10-19 points
  - ⚪ Gray: 1-4 points
- **Sticky Navigation** - Athlete names and totals stay visible while scrolling
- **Competition Details** - Hover to see event date and coefficient

**Filters:**
- Search (athlete, club, competition)
- Age category
- Gender
- Weight category
- Club
- Year
- Coefficient level

**View Modes:**
1. **Matrix View** (default) - Grid layout
2. **Athletes View** - List by athlete
3. **Competitions View** - List by event

**Click Interaction:**
- Click any athlete name → Opens detailed drawer
- View full competition history
- See all points and calculations

---

### Snapshot Management

**Access:** `/admin/snapshots`

**Purpose:** Create official, immutable rankings for publication.

#### Creating a Snapshot

1. **Select Month & Year** - Choose the period to capture
2. **Add Title** (optional) - e.g., "February 2026 Official Ranking"
3. **Generate** - System calculates all rankings automatically

**What Happens:**
- All active athletes are processed
- Points calculated up to the last day of the selected month
- Current year points summed from events
- Previous year carryover applied (40% of `last_year_pts`)
- Rankings determined per age category
- Photos and hub levels included

#### Publishing a Snapshot

- **Before Publishing:** Snapshot is draft, can be regenerated
- **After Publishing:** Snapshot becomes immutable and public
- **Protection:** Triggers prevent accidental modification

**Published snapshots appear on:**
- Public rankings page
- Athlete detail pages
- Historical archives

---

### Athlete Management

**Access:** `/admin/athletes`

**Capabilities:**
- Add new athletes
- Update profiles (name, club, categories)
- Upload photos
- Set Performance Hub level
- **Set Last Year Points** - Manual input for carryover calculation
- Deactivate athletes (remove from rankings)

**Last Year Points Field:**
- Admin-only input
- Stores previous season's total
- Used for 40% carryover in snapshots
- Independent of event data

---

### Competition & Results Management

**Access:** `/admin/events` and `/admin/results`

**Events:**
- Create competitions with dates and coefficients
- Coefficient determines point multiplier (1x to 5x)
- Events drive point calculations

**Results:**
- Record athlete placements (1st, 2nd, 3rd, etc.)
- Enter matches won
- System calculates points automatically
- Points = f(rank, matches_won, coefficient)

---

## 👥 User Roles

### 🌍 Public (Anonymous)

**Access:**
- View published rankings
- Browse athlete profiles
- See competition history
- Filter and search

**Cannot:**
- Create or modify data
- Access admin areas
- See draft snapshots

---

### 🎖️ Selector

**Access:**
- Everything public users can access
- View live rankings (real-time, unpublished data)
- Access internal dashboards

**Cannot:**
- Create snapshots
- Modify athlete data
- Publish rankings

---

### 👨‍💼 Admin

**Full Access:**
- All public and selector features
- Create and manage athletes
- Add competition results
- Create and publish snapshots
- Set last year points (manual carryover)
- Upload photos
- Assign Performance Hub levels
- System configuration

---

## 🎨 Design Philosophy

### Visual Identity

- **Swiss Red (`#DC2626`)** - Primary brand color
- **Clean Typography** - Bold, readable fonts
- **Generous Spacing** - Breathing room for content
- **Responsive Design** - Works on mobile, tablet, and desktop

### UX Principles

1. **Performance First** - Fast loading, efficient queries
2. **Clarity** - Clear labels, obvious actions
3. **Feedback** - Visual confirmation of all actions
4. **Accessibility** - Keyboard navigation, screen reader support

---

## 🚀 Key Features

### 📸 Athlete Photos
- Display in public profiles and admin views
- Fallback to icon if no photo available
- Professional presentation

### 🏆 Performance Hub Badges
- Elite status indicator
- Displayed prominently on profiles
- Admin-configurable per athlete

### 💯 Carryover System
- 40% of previous year's points carry forward
- Manual admin input via `last_year_pts` field
- Transparent calculation shown to users

### 📊 Historical Snapshots
- Browse rankings from any published period
- Compare athlete progression over time
- Immutable official records

### 🔍 Advanced Filtering
- Multi-criteria search
- Age, weight, gender, club filters
- Real-time filtering without page reload

### 🎯 Matrix View (Admin Only)
- See entire season at a glance
- 20+ athletes × 20+ competitions in one view
- Color-coded performance heatmap
- Sticky headers for easy navigation

---

## 📱 Platform Access

### Web Application
- **URL:** Your deployment URL
- **Responsive:** Works on all devices
- **Modern Browsers:** Chrome, Firefox, Safari, Edge

### Performance
- **Fast Load Times** - Optimized queries and caching
- **Real-time Updates** - No manual refresh needed
- **Scalable** - Handles thousands of athletes and results

---

## 💡 Tips & Best Practices

### For Admins

1. **Create Monthly Snapshots** - Regular cadence maintains historical records
2. **Set Last Year Points** - Update at season start for accurate carryover
3. **Upload Photos** - Professional headshots enhance public perception
4. **Use Matrix View** - Spot patterns and anomalies quickly
5. **Verify Before Publishing** - Once published, snapshots are immutable

### For Selectors

1. **Use Live Rankings** - Get real-time view without waiting for snapshots
2. **Filter by Category** - Focus on relevant age groups
3. **Check Competition History** - Understand athlete trajectory

### For Public Users

1. **Compare Snapshots** - Track athlete progress over time
2. **Use Search** - Find athletes quickly by name or club
3. **Check Point Breakdown** - Understand how totals are calculated

---

## 🎯 Summary

The Swiss Judo Ranking System provides a complete, professional solution for:

✅ **Publishing Official Rankings** - Immutable monthly snapshots
✅ **Tracking Performance** - Detailed statistics and history
✅ **Managing Athletes** - Photos, hub levels, and profiles
✅ **Analyzing Data** - Powerful matrix view and filtering
✅ **Engaging Public** - Beautiful, accessible athlete pages

---

**Built with modern technology for reliability, performance, and user experience.**

🥋 **Swiss Judo - Excellence in Competition Management**
