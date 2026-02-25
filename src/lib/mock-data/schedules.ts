import { StaffSchedule } from "@/types"

// day_of_week: 0=Sunday, 1=Monday, ..., 6=Saturday

export const schedules: StaffSchedule[] = [
  // Maria Santos (staff-001): Mon-Fri 9:00-17:00, Sat 10:00-14:00
  { id: "sched-001", staff_id: "staff-001", day_of_week: 1, start_time: "09:00", end_time: "17:00", is_available: true, created_at: "2024-03-01T09:00:00Z", updated_at: "2024-03-01T09:00:00Z" },
  { id: "sched-002", staff_id: "staff-001", day_of_week: 2, start_time: "09:00", end_time: "17:00", is_available: true, created_at: "2024-03-01T09:00:00Z", updated_at: "2024-03-01T09:00:00Z" },
  { id: "sched-003", staff_id: "staff-001", day_of_week: 3, start_time: "09:00", end_time: "17:00", is_available: true, created_at: "2024-03-01T09:00:00Z", updated_at: "2024-03-01T09:00:00Z" },
  { id: "sched-004", staff_id: "staff-001", day_of_week: 4, start_time: "09:00", end_time: "17:00", is_available: true, created_at: "2024-03-01T09:00:00Z", updated_at: "2024-03-01T09:00:00Z" },
  { id: "sched-005", staff_id: "staff-001", day_of_week: 5, start_time: "09:00", end_time: "17:00", is_available: true, created_at: "2024-03-01T09:00:00Z", updated_at: "2024-03-01T09:00:00Z" },
  { id: "sched-006", staff_id: "staff-001", day_of_week: 6, start_time: "10:00", end_time: "14:00", is_available: true, created_at: "2024-03-01T09:00:00Z", updated_at: "2024-03-01T09:00:00Z" },

  // David Chen (staff-002): Mon-Fri 10:00-18:00
  { id: "sched-007", staff_id: "staff-002", day_of_week: 1, start_time: "10:00", end_time: "18:00", is_available: true, created_at: "2024-03-01T09:00:00Z", updated_at: "2024-03-01T09:00:00Z" },
  { id: "sched-008", staff_id: "staff-002", day_of_week: 2, start_time: "10:00", end_time: "18:00", is_available: true, created_at: "2024-03-01T09:00:00Z", updated_at: "2024-03-01T09:00:00Z" },
  { id: "sched-009", staff_id: "staff-002", day_of_week: 3, start_time: "10:00", end_time: "18:00", is_available: true, created_at: "2024-03-01T09:00:00Z", updated_at: "2024-03-01T09:00:00Z" },
  { id: "sched-010", staff_id: "staff-002", day_of_week: 4, start_time: "10:00", end_time: "18:00", is_available: true, created_at: "2024-03-01T09:00:00Z", updated_at: "2024-03-01T09:00:00Z" },
  { id: "sched-011", staff_id: "staff-002", day_of_week: 5, start_time: "10:00", end_time: "18:00", is_available: true, created_at: "2024-03-01T09:00:00Z", updated_at: "2024-03-01T09:00:00Z" },

  // Aisha Patel (staff-003): Tue-Sat 9:00-17:00
  { id: "sched-012", staff_id: "staff-003", day_of_week: 2, start_time: "09:00", end_time: "17:00", is_available: true, created_at: "2024-03-15T09:00:00Z", updated_at: "2024-03-15T09:00:00Z" },
  { id: "sched-013", staff_id: "staff-003", day_of_week: 3, start_time: "09:00", end_time: "17:00", is_available: true, created_at: "2024-03-15T09:00:00Z", updated_at: "2024-03-15T09:00:00Z" },
  { id: "sched-014", staff_id: "staff-003", day_of_week: 4, start_time: "09:00", end_time: "17:00", is_available: true, created_at: "2024-03-15T09:00:00Z", updated_at: "2024-03-15T09:00:00Z" },
  { id: "sched-015", staff_id: "staff-003", day_of_week: 5, start_time: "09:00", end_time: "17:00", is_available: true, created_at: "2024-03-15T09:00:00Z", updated_at: "2024-03-15T09:00:00Z" },
  { id: "sched-016", staff_id: "staff-003", day_of_week: 6, start_time: "09:00", end_time: "17:00", is_available: true, created_at: "2024-03-15T09:00:00Z", updated_at: "2024-03-15T09:00:00Z" },

  // James Okafor (staff-004): Mon-Thu 8:00-16:00, Sat 9:00-13:00
  { id: "sched-017", staff_id: "staff-004", day_of_week: 1, start_time: "08:00", end_time: "16:00", is_available: true, created_at: "2024-04-01T09:00:00Z", updated_at: "2024-04-01T09:00:00Z" },
  { id: "sched-018", staff_id: "staff-004", day_of_week: 2, start_time: "08:00", end_time: "16:00", is_available: true, created_at: "2024-04-01T09:00:00Z", updated_at: "2024-04-01T09:00:00Z" },
  { id: "sched-019", staff_id: "staff-004", day_of_week: 3, start_time: "08:00", end_time: "16:00", is_available: true, created_at: "2024-04-01T09:00:00Z", updated_at: "2024-04-01T09:00:00Z" },
  { id: "sched-020", staff_id: "staff-004", day_of_week: 4, start_time: "08:00", end_time: "16:00", is_available: true, created_at: "2024-04-01T09:00:00Z", updated_at: "2024-04-01T09:00:00Z" },
  { id: "sched-021", staff_id: "staff-004", day_of_week: 6, start_time: "09:00", end_time: "13:00", is_available: true, created_at: "2024-04-01T09:00:00Z", updated_at: "2024-04-01T09:00:00Z" },

  // Elena Voronova (staff-005): Mon, Wed, Fri 9:00-17:00, Tue, Thu 11:00-19:00, Sat 10:00-15:00
  { id: "sched-022", staff_id: "staff-005", day_of_week: 1, start_time: "09:00", end_time: "17:00", is_available: true, created_at: "2024-04-15T09:00:00Z", updated_at: "2024-04-15T09:00:00Z" },
  { id: "sched-023", staff_id: "staff-005", day_of_week: 2, start_time: "11:00", end_time: "19:00", is_available: true, created_at: "2024-04-15T09:00:00Z", updated_at: "2024-04-15T09:00:00Z" },
  { id: "sched-024", staff_id: "staff-005", day_of_week: 3, start_time: "09:00", end_time: "17:00", is_available: true, created_at: "2024-04-15T09:00:00Z", updated_at: "2024-04-15T09:00:00Z" },
  { id: "sched-025", staff_id: "staff-005", day_of_week: 4, start_time: "11:00", end_time: "19:00", is_available: true, created_at: "2024-04-15T09:00:00Z", updated_at: "2024-04-15T09:00:00Z" },
  { id: "sched-026", staff_id: "staff-005", day_of_week: 5, start_time: "09:00", end_time: "17:00", is_available: true, created_at: "2024-04-15T09:00:00Z", updated_at: "2024-04-15T09:00:00Z" },
  { id: "sched-027", staff_id: "staff-005", day_of_week: 6, start_time: "10:00", end_time: "15:00", is_available: true, created_at: "2024-04-15T09:00:00Z", updated_at: "2024-04-15T09:00:00Z" },

  // Carlos Mendez (staff-006): Mon-Fri 10:00-18:00
  { id: "sched-028", staff_id: "staff-006", day_of_week: 1, start_time: "10:00", end_time: "18:00", is_available: true, created_at: "2024-05-01T09:00:00Z", updated_at: "2024-05-01T09:00:00Z" },
  { id: "sched-029", staff_id: "staff-006", day_of_week: 2, start_time: "10:00", end_time: "18:00", is_available: true, created_at: "2024-05-01T09:00:00Z", updated_at: "2024-05-01T09:00:00Z" },
  { id: "sched-030", staff_id: "staff-006", day_of_week: 3, start_time: "10:00", end_time: "18:00", is_available: true, created_at: "2024-05-01T09:00:00Z", updated_at: "2024-05-01T09:00:00Z" },
  { id: "sched-031", staff_id: "staff-006", day_of_week: 4, start_time: "10:00", end_time: "18:00", is_available: true, created_at: "2024-05-01T09:00:00Z", updated_at: "2024-05-01T09:00:00Z" },
  { id: "sched-032", staff_id: "staff-006", day_of_week: 5, start_time: "10:00", end_time: "18:00", is_available: true, created_at: "2024-05-01T09:00:00Z", updated_at: "2024-05-01T09:00:00Z" },

  // Sophie Laurent (staff-007): Tue-Sat 9:30-17:30
  { id: "sched-033", staff_id: "staff-007", day_of_week: 2, start_time: "09:30", end_time: "17:30", is_available: true, created_at: "2024-05-15T09:00:00Z", updated_at: "2024-05-15T09:00:00Z" },
  { id: "sched-034", staff_id: "staff-007", day_of_week: 3, start_time: "09:30", end_time: "17:30", is_available: true, created_at: "2024-05-15T09:00:00Z", updated_at: "2024-05-15T09:00:00Z" },
  { id: "sched-035", staff_id: "staff-007", day_of_week: 4, start_time: "09:30", end_time: "17:30", is_available: true, created_at: "2024-05-15T09:00:00Z", updated_at: "2024-05-15T09:00:00Z" },
  { id: "sched-036", staff_id: "staff-007", day_of_week: 5, start_time: "09:30", end_time: "17:30", is_available: true, created_at: "2024-05-15T09:00:00Z", updated_at: "2024-05-15T09:00:00Z" },
  { id: "sched-037", staff_id: "staff-007", day_of_week: 6, start_time: "09:30", end_time: "17:30", is_available: true, created_at: "2024-05-15T09:00:00Z", updated_at: "2024-05-15T09:00:00Z" },

  // Kenji Tanaka (staff-008): INACTIVE - all days unavailable
  { id: "sched-038", staff_id: "staff-008", day_of_week: 1, start_time: "09:00", end_time: "17:00", is_available: false, created_at: "2024-06-01T09:00:00Z", updated_at: "2025-11-01T09:00:00Z" },
  { id: "sched-039", staff_id: "staff-008", day_of_week: 2, start_time: "09:00", end_time: "17:00", is_available: false, created_at: "2024-06-01T09:00:00Z", updated_at: "2025-11-01T09:00:00Z" },
  { id: "sched-040", staff_id: "staff-008", day_of_week: 3, start_time: "09:00", end_time: "17:00", is_available: false, created_at: "2024-06-01T09:00:00Z", updated_at: "2025-11-01T09:00:00Z" },
  { id: "sched-041", staff_id: "staff-008", day_of_week: 4, start_time: "09:00", end_time: "17:00", is_available: false, created_at: "2024-06-01T09:00:00Z", updated_at: "2025-11-01T09:00:00Z" },
  { id: "sched-042", staff_id: "staff-008", day_of_week: 5, start_time: "09:00", end_time: "17:00", is_available: false, created_at: "2024-06-01T09:00:00Z", updated_at: "2025-11-01T09:00:00Z" },
]
