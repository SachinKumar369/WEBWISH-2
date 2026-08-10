# WebWISH Cloud Migration & Training Plan

## Project Overview

**Project:** WISH.NET → Web WISH Cloud Migration  
**Client:** Al Bahar Hotel & Resort, Fujairah (377-room property)  
**Prepared by:** Prologic First Software LLC  
**Trainer:** Suhail Aftab  
**Date:** 03 July 2026  

This plan outlines the complete migration from WISH.NET (on-premises) to Web WISH (cloud-based) for Al Bahar Hotel & Resort, Fujairah. The migration schedule will commence with the Training Phase. The Project Initiation, Staging Server Migration, and Integration Testing phases will be completed prior to the start of this phase.

---

## Migration Timeline

### Phase 1: Training (13-17 July 2026)

| Date | Session | Hours | Mode | Activities | Attendees |
|------|---------|-------|------|------------|-----------|
| **13 Jul (Mon)** | Training 1 | 10 AM-6 PM | On site | Front Office Setup, System Admin Setup & Web WISH Dashboard | FOM, Supervisor, IT |
| **14 Jul (Tue)** | Training 2 | 10 AM-6 PM | On site | Front Desk, Reservations Module, Guest & Group Module | Reservation, FO, FOM |
| **15 Jul (Wed)** | Training 3 | 10 AM-6 PM | On site | Check-in/Out, Cashiering & Folio Management | Reservation, FO, FOM |
| **16 Jul (Thu)** | Training 4 | 10 AM-6 PM | On site | Housekeeping, Sales & Marketing, Night Audit, MIS Reports | HK, SM, FOM, NA |
| **17 Jul (Fri)** | Training 5 | 10 AM-6 PM | On site | Channel Manager, Manager Functions & All-Staff Q&A | FOM, Supervisor, IT |

### Phase 2: Practice Session (20-22 July 2026)

| Date | Hours | Mode | Activities | Attendees |
|------|-------|------|------------|-----------|
| **20-22 Jul (Mon-Wed)** | 10 AM-6 PM | On site | Full Module Practice Session | Reservation, FO, HK, NA |

### Phase 3: UAT (23-24 July 2026)

| Date | Hours | Mode | Activities | Attendees |
|------|-------|------|------------|-----------|
| **23-24 Jul (Thu-Fri)** | 10 AM-6 PM | On site | Full System UAT & UAT Document Sign-Off | FOM, Supervisor, IT |

### Phase 4: Go LIVE Readiness (27-30 July 2026)

| Date | Hours | Mode | Activities | Attendees |
|------|-------|------|------------|-----------|
| **27-30 Jul (Mon-Thu)** | 10 AM-6 PM | Remote | Interface Verification and Testing (Simulator) + Document Formatting | FOM, IT (Remote) |

### Phase 5: Migration LIVE (31 July 2026)

| Date | Hours | Mode | Activities | Attendees |
|------|-------|------|------------|-----------|
| **31 Jul (Fri)** | 10 AM-6 PM | On site | Cloud Setup + WISH.NET Master Data Extraction & Migration | FOM, IT |

### Phase 6: Live Operations (1-5 August 2026)

| Date | Hours | Mode | Activities | Attendees |
|------|-------|------|------------|-----------|
| **01 Aug (Sat)** | N/A | On site | 🟢 System GO LIVE – Live Operations & Support | N/A |
| **02 Aug (Sun)** | N/A | On site | 🟢 Live Operations & Support + Night Audit Live Run | N/A |
| **03 Aug (Mon)** | N/A | On site | 🟢 Live Operations & Support + Night Audit Live Run | N/A |
| **04 Aug (Tue)** | N/A | On site | 🟢 Live Operations & Support + Night Audit Live Run | N/A |
| **05 Aug (Wed)** | 10 AM-6 PM | On site | 🟢 Final Live Support + Project Sign-Off | FOM, IT |

---

## Important Notes

### Accommodation
Al Bahar Hotel & Resort to provide accommodation, food & laundry for Trainer Suhail Aftab along with other Support Engineer for the on-site period (13th July – 5th August 2026).

### Migration Note
WISH.NET (on-premises) will be migrated to Web WISH (cloud version) on Go Live date (31st Jul) after the night Audit process in current Application.

### Schedule Legend
- **Sat/Sun Off** - No sessions
- **Migration / On site** - On-site activities
- **UAT / Practice** - User Acceptance Testing and practice sessions
- **Training** - Training sessions
- **Live Cover** - Live support coverage
- **All sessions:** 10:00 AM – 6:00 PM

---

## Key Milestones

1. **Training Completion** - 17 July 2026
2. **Practice Session Completion** - 22 July 2026
3. **UAT Sign-Off** - 24 July 2026
4. **Go LIVE Readiness Confirmation** - 30 July 2026
5. **Migration Execution** - 31 July 2026
6. **System GO LIVE** - 1 August 2026
7. **Project Sign-Off** - 5 August 2026

---

## Roles & Responsibilities

### Client Team (Al Bahar Hotel & Resort)
- **FOM (Front Office Manager):** Primary point of contact, coordinates with all departments
- **Supervisor:** Assists with training coordination and UAT
- **IT Team:** Technical support, data migration, interface testing
- **Reservation Team:** Reservations module training and UAT
- **Front Office (FO):** Front desk operations training and UAT
- **Housekeeping (HK):** Housekeeping module training and UAT
- **Sales & Marketing (SM):** Sales & Marketing module training
- **Night Audit (NA):** Night audit processes and reporting

### Prologic First Team
- **Trainer (Suhail Aftab):** On-site training and support
- **Support Engineer:** Technical support during migration

---

## Testing & Validation Plan

### Automated Testing Coverage
The following modules will be covered by Playwright automation tests:

1. **Login & Authentication** - Valid/invalid login scenarios
2. **Front Office Setup** - System configuration and parameter setup
3. **Guest Management** - Guest profiles, activities, and history
4. **Room Inventory** - Room management and availability
5. **Marketing Profiles** - Marketing module functionality
6. **Global Search** - System-wide search functionality
7. **Manager Functions** - Administrative functions and reports
8. **Database Validation** - Data integrity checks between UI and database

### Test Execution Strategy
- **Pre-Migration:** Run existing test suite to establish baseline
- **During Migration:** Monitor automated tests for regression
- **Post-Migration:** Full regression testing on cloud platform
- **UAT Support:** Automated tests to validate critical paths during UAT

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Data loss during migration | Complete backup before migration, incremental backups during |
| System downtime | Night Audit process before migration to minimize impact |
| User adoption issues | Comprehensive training sessions with hands-on practice |
| Technical issues | Remote support available during Go LIVE Readiness phase |
| Interface failures | Simulator testing before live migration |

---

## Success Criteria

1. **Training Completion:** All scheduled training sessions completed successfully
2. **UAT Approval:** UAT document signed off by FOM, Supervisor, and IT
3. **Data Integrity:** 100% data migration accuracy verified
4. **System Performance:** Cloud system meets or exceeds on-premises performance
5. **User Proficiency:** All users can perform their daily tasks on new system
6. **Project Sign-Off:** Formal sign-off from all stakeholders on 5 August 2026

---

## Communication Plan

- **Daily Updates:** During training and live phases
- **Weekly Reports:** During practice and UAT phases
- **Escalation Path:** FOM → IT Manager → Prologic First Support
- **Emergency Contact:** Available 24/7 during Go LIVE and first week of operations

---

*Document Version:* 1.0  
*Last Updated:* 03 July 2026  
*Classification:* Confidential – For Customer Use Only