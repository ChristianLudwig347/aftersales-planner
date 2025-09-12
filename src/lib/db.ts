// src/lib/db.ts
export type Employee = {
  id: string;
  name: string;
  performance: number; // 50..150
  category: "MECH" | "BODY" | "PREP";
};

const store: { employees: Employee[] } = { employees: [] };

export function getEmployees(): Employee[] {
  return store.employees;
}

export function addEmployee(e: Omit<Employee, "id"> & { id?: string }): Employee {
  const emp: Employee = { id: e.id ?? crypto.randomUUID(), ...e };
  store.employees.push(emp);
  return emp;
}
