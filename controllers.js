import { uid } from "uid";

export const getTaskById = (id, Tasks) => {
  let ids = Tasks.map((task) => task.id);
  if (ids.includes(id)) {
    return Tasks.filter((task) => task.id == id)[0];
  } else {
    return `Task with id ${id} not found`;
  }
};
export const createTask = (name, Tasks) => {
  let names = Tasks.map((task) => task.name);
  if (name && !names.includes(name)) {
    let temp = { id: uid(), name, complete: false };
    Tasks.push(temp);
    return Tasks;
  } else if (names.includes(name)) {
    return "Task with same name already exists";
  }
};
export const updateTaskById = (id, Tasks, { complete, name }) => {
  let ids = Tasks.map((task) => task.id);
  if (ids.includes(id)) {
    return Tasks.map((task) => {
      if (task.id == id) {
        task.complete = complete;
        task.name = name;
      }
      return task;
    });
  } else {
    return `Task with id ${id} not found`;
  }
};

export const deleteTaskById = (id, Tasks) => {
  let ids = Tasks.map((task) => task.id);
  if (ids.includes(id)) {
    return Tasks.filter((task) => task.id !== id);
  } else {
    return `Task with id ${id} not found`;
  }
};
