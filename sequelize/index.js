'use strict';

const {Sequelize, DataTypes} = require('sequelize');
const path = require('path');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, 'db.sqlite'),
  logging: false,
});

module.exports = async () => {
  try {
    await sequelize.authenticate();

    await oneToOneTest();
    await oneToManyTest();
    await manyToManyTest();

  } catch (error) {
    console.error(error);
  }
};

async function oneToOneTest() {
  const Mobile = sequelize.define("mobile", {
    name: DataTypes.STRING,
  }, {
    timestamps: false
  });
  const Charger = sequelize.define("charger", {
    name: DataTypes.STRING,
  }, {
    timestamps: false
  });

  // One To One
  Mobile.hasOne(Charger);
  Charger.belongsTo(Mobile);

  await sequelize.sync({force: true});

  // insert mobile and charger
  await Mobile.create({
    name: 'Samsung S22',
    charger: {
      name: '25W Adaptor'
    }
  }, {
    include: Charger
  });

  // insert mobile and charger as independent
  const iphone = await Mobile.create({name: 'iPhone'});
  const _20w = await Charger.create({name: '20W Adaptor'});
  await _20w.setMobile(iphone);
  const mobile = await Mobile.findOne({
    where: {
      name: 'iPhone'
    },
    include: Charger
  });
  const charger = await Charger.findOne({
    where: {
      name: '20W Adaptor'
    },
    include: Mobile
  });
  console.log(mobile.name, mobile.charger.name);
  console.log(charger.name, charger.mobile.name);
}

async function oneToManyTest() {
  const User = sequelize.define("user", {
    name: DataTypes.STRING,
  }, {
    timestamps: false
  });
  const Book = sequelize.define("book", {
    title: DataTypes.STRING,
    price: DataTypes.NUMBER,
  }, {
    timestamps: false
  });

  // One To Many
  Book.belongsTo(User);
  User.hasMany(Book);

  await sequelize.sync({force: true});

  // insert user and books
  await User.create({
    name: 'ali',
    books: [
      {title: 'Math', price: 200},
      {title: 'Physics', price: 250},
    ]
  }, {
    include: Book
  });

  // find user and add book
  const user = await User.findOne({
    where: {
      name: 'ali'
    }
  });
  // get books of user
  let userBooks = await user.getBooks(); // use User.hasMany(Book)
  console.log(userBooks);
  // add new book to user
  const chemistryBook = await user.createBook({
    title: 'Chemistry',
    price: 150,
  });
  // get books of user include new book
  userBooks = await user.getBooks();
  console.log(userBooks);
  // remove new book
  await user.removeBook(chemistryBook);
  // get books of user without new book
  userBooks = await user.getBooks();
  console.log(userBooks);

  const book = await Book.findOne({
    where: {
      title: 'Math'
    }
  });
  // get user of bool
  const userOfBook = await book.getUser(); // => use Book.belongsTo(User)
  console.log(userOfBook.name);
}

async function manyToManyTest() {
  const User = sequelize.define("user", {
    name: DataTypes.STRING,
  }, {
    timestamps: false
  });
  const Project = sequelize.define("project", {
    name: DataTypes.STRING,
  }, {
    timestamps: false
  });

  // Many To Many
  User.belongsToMany(Project, {through: 'user_projects'});
  Project.belongsToMany(User, {through: 'user_projects'});

  await sequelize.sync({force: true});

  // insert users and projects
  const nodeJsProject = await Project.create({
    name: 'nodeJS',
    users: [
      {name: 'ali'},
      {name: 'zahra'},
    ]
  }, {
    include: User
  });

  // add new user to project
  await nodeJsProject.createUser({
    name: 'farhad'
  });

  // create user without project
  const sepideh = await User.create({
    name: 'sepideh'
  });
  const shahin = await User.create({
    name: 'shahin'
  });
  // add exists user to project
  await nodeJsProject.addUser(sepideh);

  const golangPrject = await Project.create({name: 'golang'});
  await golangPrject.addUser(sepideh);
  await golangPrject.addUser(shahin);
  const oldUser = await User.findOne({
    where: {
      name: 'ali'
    }
  });
  await golangPrject.addUser(oldUser);

  // users of projects
  const usersOfNodeJS = await nodeJsProject.getUsers();
  for (const user of usersOfNodeJS) {
    console.log(`project ${nodeJsProject.name} => user ${user.name}`);
  }
  const usersOfGolang = await golangPrject.getUsers();
  for (const user of usersOfGolang) {
    console.log(`project ${golangPrject.name} => user ${user.name}`);
  }

  // projects of users
  const user1 = await User.findOne({
    where: {
      name: 'sepideh'
    }
  });
  const user1Projects = await user1.getProjects(); // lazy loading
  for (const project of user1Projects) {
    console.log(`user ${user1.name} => project ${project.name}`);
  }

  const user2 = await User.findOne({ // include projects
    where: {
      name: 'shahin'
    },
    include: Project
  });
  for (const project of user2.projects) {
    console.log(`user ${user2.name} => project ${project.name}`);
  }
}
