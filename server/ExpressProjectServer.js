const path = require('path');
const express = require('express')
const bodyParser = require('body-parser')
const School = require('../School.js')
const cors = require('cors')
const app = express();
app.use(express.static(path.join(__dirname, "../client")));

const {
    db
} = require('../database/databaseInfo.js'); //connected db instance


app.use(cors())
let mySchool = new School();

let port = process.env.PORT;
if (port == null || port == "") {
    //change port back
    port = 3100;
}


app.use(bodyParser.urlencoded({
    extended: false
}))
app.use(bodyParser.json())

//function create a timestamp
const timeStamp = () => new Date().toLocaleString()


//query to add a new class to the database
const addClassMethod = async (req, res, next) => {
    const classname = req.body.className
    const teacher = req.body.teacher
    try {
        let insertQuery = `INSERT INTO class(classname,teacher,timeStamp) VALUES($/classname/,$/teacher/,$/timeStamp/) RETURNING *`;
        req.returnQuery = await db.one(insertQuery, {
            classname,
            teacher,
            timeStamp
        })
        next()
    } catch (err) {
        // Class already created 
        if (err.code === "23505" && err.detail.includes("already exists")) {
            let customErr = "Class already exist. Please enter a different one.";
            err = customErr;
            res.send({
                message: err,
                error: true,
                timeStamp: timeStamp()
            })
        }
        throw err;
    }
}
//checks to see if all the information for the classis filled out
const emptyClassData = (req, res, next) => {
    let classname = req.body.className;
    let teacher = req.body.teacher;
    classname === '' || teacher === '' ? res.status(400).send({
        message: 'Please fill out all of the class information',
        error: true
    }) : next()
}
//sends class creation information
const sendClassResults = (req, res) => {
    let data = req.getQuery
    res.status(200).json({
        class: data,
        message: "Created a new class",
        status: 'success',
        error: false
    })
}

app.post('/class', addClassMethod, emptyClassData, sendClassResults)

//checks if the student already exists
validateStudent = (req, res, next) => {
    console.log("validating");
    let studentName = req.body.studentName;
    let data = req.getQuery
    for (let i = 0; i < data.length; i++){
        if (data[i].studentname === studentName) {
            res.json({
                status: 'failed',
                message: 'Student already exist',
                 error:true
            })
        } else {
            next()
        }
    }
}

//query to add a new student in the database
const enrollClass = async (req, res, next) => {
    let classname = req.params.classname;
    let studentName = req.body.studentName;
    let age = req.body.age;
    let city = req.body.city;
    let grade = req.body.grade

    try {
        let insertQuery = `INSERT INTO students(classname,studentName,age,city,grade,timeStamp) 
        VALUES($/classname/,$/studentName/,$/age/,$/city/,$/grade/,$/timeStamp/) RETURNING * `;
        req.studentInsertQuery = await db.one(insertQuery, {
            classname,
            studentName,
            age,
            city,
            grade,
            timeStamp
        })
        next()
    } catch (err) {
        // Class already created 
        if (err.code === "23505" && err.detail.includes("already exists")) {
            let customErr = "Student is already enrolled. Please try a different one.";
            err = customErr;
            res.send({
                payload: err,
                error: true
            })
        }
        throw err;
    }
}

//checks to see if all the information for the student is filled out
const invalidStudent = (req, res, next) => {
    let studentName = req.body.studentName;
    let age = req.body.age;
    let city = req.body.city;
    let grade = req.body.grade

    studentName === '' || age === '' || grade === '' || city === '' ? res.status(400).send({
        errMessage: 'Please fill out all the information for the student',
        error: true,
        timeStamp: timeStamp()
    }) : next()
}
//sends the student enrollment data
const sendStudentResults = (req, res) => {
    let data = req.studentInsertQuery
    let classname = req.params.classname;
    res.status(200).json({
        classname:classname,
        message: "Enrolled Student",
        student: data,
        status: 'success',
        error: false
    })
}

//query to database to get student and check if student is failing or not
const getStudentsByClass = async (req, res, next) => {
    let classname = req.params.classname;
    // let city = req.query.city;
    let failing = req.query.failing;
    console.log("failing", typeof failing);
    failing === "false" ? getQuery = 'SELECT * FROM students WHERE className = $/classname/' :
    getQuery = 'SELECT * FROM students WHERE className = $/classname/ AND grade < 65'
    
    try {
        req.getQuery = await db.any(getQuery, {
            classname
        });
        next()
    } catch (err) {
        if (err instanceof errors.QueryResultError) {
            if (err.code === errors.queryResultErrorCode.noData) {
                return false;
            }
        }
        throw err;
    }
}
//validates if class contains any students
const validateClassQuery = (req, res, next) => {
    let classname = req.params.classname;
    let data = req.getQuery
    console.log(data);
    
    if (data.length === 0) {
        res.status(404);
        res.json({
            status: 'failed',
            message: `${classname} is empty please enroll students`,
            timeStamp: timeStamp()
        })
    } else {
        next();
    }
}
//middleware to send filter results
const sendFilterResults = (req, res) => {
    let classname = req.params.classname;
    let data = req.getQuery
    res.status(200).json({
        student: data,
        classname: classname,
        message: "Retrieved Students",
        status: 'success',
        error: false
    })
}


//app endpoints
app.post('/class/:classname/enroll', invalidStudent, getStudentsByClass, validateStudent, enrollClass, sendStudentResults)
app.get('/class/:classname/students', getStudentsByClass, validateClassQuery, sendFilterResults)


app.use('/', (req, res, next) => {
    res.sendFile(path.resolve(__dirname, '../client/frontEnd.html'))
})



app.listen(port, () => {
    console.log(`Running at http://localhost:${port}/`);

})