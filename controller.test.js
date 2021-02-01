import {
  updateTaskById,
  deleteTaskById,
  getTaskById,
  createTask,
} from "./controllers";

const Store = [
  { id: 1, name: "Test", complete: false },
  { id: 2, name: "Test 2", complete: true },
];

describe("Controllers", () => {
  it("createTask: should create Task and length of store should be 3", () => {
    let tempStore = createTask("tester000", Store);
    expect(tempStore.length).toBe(3);
  });

  it("createTask: should return 'Task with same name already exists'", () => {
    let errorResponse = createTask("Test", Store);
    expect(errorResponse).toBe("Task with same name already exists");
  });

  it("getTaskById: should return task with id 1", () => {
    let response = getTaskById(1, Store);
    expect(response.id).toBe(1);
  });

  it("getTaskById: should return 'Task with id 4 not found'", () => {
    let errorResponse = getTaskById(4, Store);
    expect(errorResponse).toBe("Task with id 4 not found");
  });

  it("updateTaskById: should update Task with id 1 to have name of Tester", () => {
    let tempStore = updateTaskById(1, Store, {
      name: "Tester",
      complete: false,
    });
    expect(tempStore[0].name).toBe("Tester");
  });

  it("updateTaskById: should return 'Task with id 4 not found'", () => {
    let errorResponse = updateTaskById(4, Store, {
      complete: false,
      name: "asdf",
    });
    expect(errorResponse).toBe("Task with id 4 not found");
  });

  it("deleteTaskById: should delete Task with id 1 leaving the Store's length = 1", () => {
    let tempStore = deleteTaskById(1, Store);
    expect(tempStore.length).toBe(2);
  });

  it("deleteTaskById: should return 'Task with id 4 not found'", () => {
    let errorResponse = deleteTaskById(4, Store);
    expect(errorResponse).toBe("Task with id 4 not found");
  });
});
