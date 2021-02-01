import "dotenv/config";
import express from "express";
import bodyParser from "body-parser";
import logger from "morgan";
import {
  deleteTaskById,
  getTaskById,
  updateTaskById,
  createTask,
} from "./controllers";

const { PORT } = process.env;
var app = express();

app.use(logger("dev"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

var Tasks = [];
app.get("/check/healthz", (req, res) => {
  res.send("pong!");
});

app.get("/:id", (req, res) => {
  const { id } = req.params;
  const result = getTaskById(id, Tasks);

  if (result.hasOwnProperty("name")) {
    res.status(200).send(`${JSON.stringify(result, undefined, 2)}`);
  } else {
    res.status(400).send(result);
  }
});

app.put("/:id", (req, res) => {
  const { id } = req.params;
  const { complete, name } = req.body;

  const result = updateTaskById(id, Tasks, { complete, name });

  if (Array.isArray(result)) {
    Tasks = result;
    res.status(200).send(`Task with ${id} updated`);
  } else {
    res.status(400).send(result);
  }
});

app.delete("/:id", (req, res) => {
  const { id } = req.params;
  const result = deleteTaskById(id, Tasks);
  if (Array.isArray(result)) {
    Tasks = result;
    res.status(200).send(`Task with ${id} deleted`);
  } else {
    res.status(400).send(result);
  }
});

app.post("/create", (req, res) => {
  const { name } = req.body;
  const result = createTask(name, Tasks);
  if (Array.isArray(result)) {
    Tasks = result;
    const temp = Tasks.filter((task) => task.name == name)[0];
    res.status(201).send("Created" + JSON.stringify(temp, undefined, 2));
  } else {
    res.status(400).send(result);
  }
});

app.get("/", (req, res) => {
  res.status(200).send(Tasks);
});

app.listen(PORT, () => console.log(`Listening on port ${PORT}!`));
