# Annotation Analytics Assessment — Plan

## Goal

Implement annotation analytics in CVAT while following the existing Django, CVAT IAM, React, database, and WebSocket architecture. Work will be completed in assessment order, with items 1–4 treated as the minimum required floor before moving to advanced features.

## Implementation Order & Time Allocation

| Time      | Work                                                                                                                                                                                                                 |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0:00–0:30 | Create/register the required new Django `test` app, add routing structure, verify CVAT starts correctly                                                                                                              |
| 0:30–2:00 | Item 1: Implement API endpoint for per-class annotation counts using database-side aggregation. Add task-level authentication/access control using CVAT's existing IAM/permission system                             |
| 2:00–3:15 | Items 2–3: Build the frontend page, call the API, and display class counts as a graph using existing frontend/chart infrastructure                                                                                   |
| 3:15–3:45 | Item 4: Implement clean no-data and failed-request states                                                                                                                                                            |
| 3:45–4:15 | Define and measure the API speed target. Run 5 measurements and record median and spread from raw machine output                                                                                                     |
| 4:15–4:45 | Item 7: Add one useful filter/grouping beyond plain class count. Preferred choice: annotation `source`, because it provides useful information about annotation provenance without unnecessarily complicating the UI |
| 4:45–6:15 | Items 8–9: Reuse CVAT's existing event/WebSocket architecture for live graph updates and implement recovery/reconnection after connection loss                                                                       |
| 6:15–6:45 | Integration testing, authentication/access testing, evidence collection, and verification of unfinished items                                                                                                        |
| 6:45–7:15 | Complete Objectives, Definition of Done, and Plan decision record if Item 10 is reached                                                                                                                              |
| 7:15–7:45 | Record one Loom walkthrough, maximum 5 minutes, covering the required feature flow and four assessment questions                                                                                                     |
| 7:45–8:00 | Final Git/PR verification and submission preparation                                                                                                                                                                 |

## Technical Approach

### Backend

Create the required new Django app named `test` rather than modifying existing CVAT application code.

The analytics endpoint will use CVAT's existing annotation models and perform counting in the database rather than loading all annotations into Python. For the COCO validation data, the primary annotation unit will be `LabeledShape`, with its inherited `label` relation used to obtain the class name.

The endpoint will return structured JSON containing each class name and its annotation count.

Task access will use CVAT's existing authentication and IAM permission architecture. Unauthenticated requests must be rejected, and an authenticated user without access to the requested task must also be rejected.

### Frontend

Add a focused analytics page to the existing CVAT React application. The page will request the analytics endpoint and display the returned class counts as a graph.

The UI will explicitly handle:

* successful data;
* task with no annotations/data;
* failed API request.

No unnecessary frontend dependencies will be introduced.

### Additional Filter/Grouping

Add one additional annotation `source` filter/grouping beyond the required class count. This is useful because it allows the analytics view to distinguish annotation provenance while keeping the implementation small and understandable.

### Live Updates

If Items 1–4 are verified, reuse CVAT's existing event/WebSocket infrastructure to update analytics when annotations change. The frontend will recover by reconnecting and refreshing analytics data after a dropped WebSocket connection.

## Performance Objective

The API target will be a median response time of **≤200 ms** for five local requests against the assessment task.

The actual result will be measured from machine output. Five runs will be recorded, and the median and spread will be reported honestly in `docs/Objectives.md`. If the target is missed, the measured result and reason will be documented rather than hidden.

## Scope Already Decided to Skip

* No ML/AI model training or unrelated ML work.
* No production deployment or production-grade infrastructure.
* No unnecessary refactoring of CVAT.
* No extra analytics filters beyond the selected additional filter unless time remains.
* No unnecessary third-party dependency installation.
* No visual polish that does not contribute to the assessed functionality.

The priority is correctness of Items 1–4 first. If advanced WebSocket work threatens the required floor, unfinished advanced items will be documented honestly rather than compromising the working core feature.

## Decision Record

If Item 10 is reached, the final decision record will document:

1. the approach selected;
2. the alternative approach rejected;
3. the cost/trade-off of rejecting that alternative.
