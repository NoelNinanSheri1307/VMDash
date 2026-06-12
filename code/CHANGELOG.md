# Changelog

## [Stage 3] - 2026-06-12
### Added
- Completed Stage 3: Virtual Machine Operations Center.
- Built a fixed-position sliding details drawer ([VmDrawer.jsx](file:///c:/Users/VICTUS/VMDash/code/infra-code/frontend/src/components/VmDashboard/VmDrawer.jsx)) using `framer-motion` featuring 5 spec details tabs.
- Implemented drawer details caching using a React-state cache map that clears only during VM refresh or owner modification events.
- Created a centralized resource filter configuration file ([vmThresholds.js](file:///c:/Users/VICTUS/VMDash/code/infra-code/frontend/src/constants/vmThresholds.js)).
- Integrated duplicate `vm_name` verification at load time to block rendering and alert administrators if duplicate VM identifiers exist.
- Styled a prominent, pulsing caution animation for the "Unassigned VMs" KPI card to draw attention to orphaned VMs.
- Enforced strict RBAC user data protection rules in the Ownership tab, ensuring regular users can only see their own focal point records.
- Added a "Top Nodes By VM Count" Plotly chart to the operations strip to check host capacity limits.
- Added checkboxes to rows for selecting, and a sticky toolbar containing selection summaries and bulk export controls.
- Retained collapsible inline sub-details row formatting inside [VmRow.jsx](file:///c:/Users/VICTUS/VMDash/code/infra-code/frontend/src/components/VmDashboard/VmRow.jsx) as a secure fallback.

## [Stage 2] - 2026-06-12
### Added
- Completed Stage 2: Infrastructure Operations Center.
- Role-based theme accents (Blue for Admin, Green for Manager, Red for User).
- Dynamic CSS variables in `index.css` mapped to `data-role` root attribute.
- AppLayout set to dynamically update `data-role` and enforce navigation restrictions per role.
- Redesigned Dashboard: 6 KPI cards (Total VMs, Running/Stopped, Nodes, Clusters, Storage Pools), Allocated Resources summary, Health logs/warnings, and corporate ownership distributions (Entity, Division, Group).
- Enhanced Nodes Status screen: 5 summary KPI cards, searching, column sorting, and 3 Plotly comparison charts (Memory capacity, CPU Core count, Uptime comparisons).
- Enhanced Clusters List screen: Detailed aggregate summaries (VM count, Node count, allocated CPU, RAM, and Disk space derived from VM specifications) and Plotly distribution charts.
- Enhanced Storage Volumes screen: 4 summary cards, search filter, column sorting, capacity progress bars utilizing actual parsed VM disk sizes, and 3 Plotly storage charts.
- Verified successful production compilation via `npm run build`.
