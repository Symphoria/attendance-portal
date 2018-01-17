console.log("loaded");
// using jQuery
function getCookie(name) {
    var cookieValue = null;
    if (document.cookie && document.cookie != '') {
        var cookies = document.cookie.split(';');
        for (var i = 0; i < cookies.length; i++) {
            var cookie = jQuery.trim(cookies[i]);
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) == (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}
var csrftoken = getCookie('csrftoken');
function csrfSafeMethod(method) {
    // these HTTP methods do not require CSRF protection
    return /^(GET|HEAD|OPTIONS|TRACE)$/.test(method);
}
$.ajaxSetup({
    beforeSend: function(xhr, settings) {
        if (!csrfSafeMethod(settings.type) && !this.crossDomain) {
            xhr.setRequestHeader("X-CSRFToken", csrftoken);
        }
    }
});

var globalObject = {
    lectureRating: 0
};
var authToken = localStorage.getItem('authToken');

if (authToken !== null) {
    globalObject.authToken = authToken;
}

var ratingMap = {
    star5: 5,
    star4half: 4.5,
    star4: 4,
    star3half: 3.5,
    star3: 3,
    star2half: 2.5,
    star2: 2,
    star1half: 1.5,
    star1: 1,
    starhalf: 0.5
};

let d = new Date();
let m = d.getMonth() + 1;
globalObject.currentMonth = m;

function getStudentCourses() {
    $('div#course-wrapper').empty();

    var loader = document.createElement('div');
    loader.setAttribute('class', 'loader');
    $('div#course-wrapper').append(loader);

    $.ajax({
        type: 'GET',
        dataType: 'json',
        headers: {
            'authorization-token': globalObject.authToken
        },
        url: 'https://attendance-portal.herokuapp.com/api/students',
        success: function (data) {
            $('div#course-wrapper').empty();
            data.coursesTaken.forEach(function (element) {
                var box = document.createElement("div");
                box.setAttribute('class', 'col-sm-4 col-lg-4 col-md-5');
                var thumbnail = document.createElement('div');
                thumbnail.className = 'thumbnail';
                thumbnail.innerHTML += "<center><div class='caption'><h3>" + element.course_code + "</h3><h5>" + element.course_name +
                    "</h5><button id='" + element.course_code + "' class='btn btn-success view-student-attendance'>View Attendance</button></div></center>";
                $(box).append(thumbnail);
                $('div#course-wrapper').append(box);
            }, this);
        }
    })
}

function getProfessorCourses() {
    $('div#course-wrapper').empty();

    var loader = document.createElement('div');
    loader.setAttribute('class', 'loader');
    $('div#course-wrapper').append(loader);

    $.ajax({
        type: 'GET',
        dataType: 'json',
        headers: {
            'authorization-token': globalObject.authToken
        },
        url: "https://attendance-portal.herokuapp.com/api/faculty/course",
        success: function (data) {
            $('div#course-wrapper').empty();

            data.forEach(function (element) {
                var box = document.createElement("div");
                box.setAttribute('class', 'col-sm-4 col-lg-4 col-md-5');
                var thumbnail = document.createElement('div');
                thumbnail.className = 'thumbnail';
                thumbnail.innerHTML += `<center>
                    <div class="caption">
                        <h3>` + element.course_name + `</h3>
                        <h4 id="courseCode">` + element.course_code + `</h4>
                    </div>
                    <!-- View Token -->
                    <div class="caption">
                        <button id="generateTokens" class="btn btn-primary" data-toggle="modal" data-target="#myModalNorm" data-coursecode="` + element.course_code + `">
                            Generate Tokens
                        </button>
                        <br>

                    </div>
                </center>`;
                $(box).append(thumbnail);
                $('div#course-wrapper.row').append(box);
            }, this);
        }
    })
}

$('button#student.btn.btn-success.login').click(function () {
    $.ajax({
        type: 'POST',
        dataType: 'json',
        url: 'https://attendance-portal.herokuapp.com/api/login',
        data: {
            'userType': $(this).attr('id'),
            'userName': $('input#studentUsername').val().trim(),
            'password': $('input#studentPassword').val().trim()
        },
        success: function (data) {
            localStorage.setItem('authToken', data.authToken);
            globalObject.authToken = data.authToken;
            window.location.href = "https://attendance-portal.herokuapp.com/student";
        },
        error: function (error) {
            alert(error.responseJSON.message)
        }
    })
});

$('button#professor.btn.btn-success.login').click(function () {
    $.ajax({
        type: 'POST',
        dataType: 'json',
        url: 'https://attendance-portal.herokuapp.com/api/login',
        data: {
            'userType': $(this).attr('id'),
            'userName': $('input#professorUsername').val().trim(),
            'password': $('input#professorPassword').val().trim()
        },
        success: function (data) {
            localStorage.setItem('authToken', data.authToken);
            globalObject.authToken = data.authToken;
            window.location.href = "https://attendance-portal.herokuapp.com/professor";
        },
        error: function (error) {
            alert(error.responseJSON.message)
        }
    })
});

if (window.location.href.split('/').reverse()[0] == 'student') {
    document.addEventListener('DOMContentLoaded', getStudentCourses);
}

if (window.location.href.split('/').reverse()[0] == 'professor') {
    document.addEventListener('DOMContentLoaded', getProfessorCourses);
}

$('button#add-course-professor.btn.btn-success').click(function() {
    $.ajax({
        type: 'POST',
        dataType: 'json',
        headers: {
            'authorization-token': globalObject.authToken
        },
        url: "https://attendance-portal.herokuapp.com/api/faculty/course",
        data: {
            "course": $('input#add-course-courseId.form-control').val().trim()
        },
        success: function (data) {
            alert(data.responseText);
            getProfessorCourses();
        },
        error: function (error) {
            alert(error.responseText);
        }
    })
});

$('button#remove-course-professor.btn.btn-danger').click(function() {
    $.ajax({
        type: 'DELETE',
        dataType: 'json',
        headers: {
            'authorization-token': globalObject.authToken
        },
        url: "https://attendance-portal.herokuapp.com/api/faculty/course",
        data: {
            "course": $('input#add-course-courseId.form-control').val().trim()
        },
        success: function (data) {
            alert(data.responseText);
            getProfessorCourses();
        },
        error: function (error) {
            alert(error.responseText);
        }
    })
});

$('button#add-course-student.btn.btn-success').click(function() {
    $.ajax({
        type: 'PUT',
        dataType: 'json',
        headers: {
            'authorization-token': globalObject.authToken
        },
        url: "https://attendance-portal.herokuapp.com/api/student/course",
        data: {
            "course": $('input#add-course-courseId.form-control').val().trim(),
            "semester": $('input#add-course-semester.form-control').val().trim(),
            "section": $('input#add-course-section.form-control').val().trim()
        },
        success: function (data) {
            alert(data);
            getStudentCourses();
        },
        error: function (error) {
            alert(error.responseText);
        }
    })
});

$('button#remove-course-student.btn.btn-danger').click(function() {
    $.ajax({
        type: 'DELETE',
        dataType: 'json',
        headers: {
            'authorization-token': globalObject.authToken
        },
        url: "https://attendance-portal.herokuapp.com/api/student/course",
        data: {
            "course": $('input#add-course-courseId.form-control').val().trim(),
            "semester": $('input#add-course-semester.form-control').val().trim(),
            "section": $('input#add-course-section.form-control').val().trim()
        },
        success: function (data) {
            console.log(data);
            alert(data);
            getStudentCourses();
        },
        error: function (error) {
            console.log(error);
            alert(error.responseText);
        }
    })
});

$('button#update-student.btn.btn-success').click(function() {
    $.ajax({
        type: 'PUT',
        dataType: 'json',
        headers: {
            'authorization-token': globalObject.authToken
        },
        url: "https://attendance-portal.herokuapp.com/api/students",
        data: {
            "name": $('input#student-name.form-control').val().trim(),
            "email": $('input#student-email.form-control').val().trim(),
            "currentSemester": $('input#student-semester.form-control').val().trim(),
            "graduationYear": $('input#student-graduation-year.form-control').val().trim()
        },
        success: function (data) {
            alert(data);
        },
        error: function (error) {
            alert(error.responseText);
        }
    })
});

$('button#course-attendance.btn.btn-primary').on('click', function () {
    let course = $('input#attendance-courseId.form-control').val().trim();
    let section = $('input#attendance-section.form-control').val().trim();
    let month = $('input#attendance-month.form-control').val().trim();
    $('div#course-attendance-wrapper.container.table-responsive.table-hover').empty();

    var loader = document.createElement('div');
    loader.setAttribute('class', 'loader');
    $('div#course-attendance-wrapper.container.table-responsive.table-hover').append(loader);
    globalObject.currentMonth = month;
    $.ajax({
        type: 'GET',
        dataType: 'json',
        headers: {
            'authorization-token': globalObject.authToken
        },
        url: "https://attendance-portal.herokuapp.com/api/attendance/course?course=" + course + "&section=" + section + "&month=" + month,
        success: function (data) {
            $('h3#down-error-message').text("");
            let htmlString = `<center><h3>` + course.toUpperCase() + `</h3></center><center><h4>` + data.rating + `</h4></center>

    <table class="table table-hover">
        <thead>
        <tr>
            <th>Enrolment No.</th>
            <th>Name</th>
            <th colspan="12">
                <center>Attendance</center>

            </th>
        </tr>
        <tr>
            <th></th>
            <th></th>`
            data.payload[0].attendanceData.forEach(function (element) {
                htmlString += "<th>" + element.date.slice(0, 5) + "</th>"
            });

            htmlString += `<th></th>

        </tr>
        <tr>
        <th></th>
            <th></th>`;
            data.payload[0].attendanceData.forEach(function (element) {
                htmlString += "<th>" + element.lecture_type + "</th>"
            });
            htmlString += `<th></th>
        
        </tr>
        </thead>
        <tbody>`
            data.payload.forEach(function (element) {
                htmlString += `<tr>
            <td>` + element.enrollmentNo.toUpperCase() + `</td>
            <td>` + element.name + `</td>`;
                element.attendanceData.forEach(function (attendance) {
                    if (attendance.is_present) {
                        htmlString += `<td>P</td>`
                    } else {
                        htmlString += `<td>A</td>`
                    }
                });
            });
            htmlString += `</tbody>
    </table>`;
            $('div#course-attendance-wrapper.container.table-responsive.table-hover').html(htmlString);
        },
        error: function (error) {
            $('div#course-attendance-wrapper').empty();
            alert(error.responseText);

        }
    })
});


$('button#increase-token.btn.btn-primary').click(function () {
    $.ajax({
        type: 'PUT',
        dataType: 'json',
        headers: {
            'authorization-token': globalObject.authToken
        },
        url: "https://attendance-portal.herokuapp.com/api/attendance-tokens",
        data: {
            "token": $('input#attendance-token.form-control').val().trim(),
            "increaseBy": $('input#attendance-count.form-control').val().trim()
        },
        success: function (data) {
            $(this).addClass("disable");
            alert(data);
        },
        error: function (error) {
            alert(error.responseText);
        }
    })
});

$('button#getTokens').click(function () {
    $('#myModalNorm').modal('hide');
    $('div#attendance-wrapper').empty();

    var loader = document.createElement('div');
    loader.setAttribute('class', 'loader');
    $('div#attendance-wrapper').append(loader);

    var lectureType, noOfLectures;

    if (document.getElementById('lab').checked) {
        lectureType = 'lab';
    } else {
        lectureType = 'theory';
    }

    if (document.getElementById('1-hour').checked || document.getElementById('lab-hour').checked) {
        noOfLectures = 1;
    } else if (document.getElementById('2-hour').checked) {
        noOfLectures = 2;
    }

    var dateTime = $('input#datetimepicker5.form-control').val().trim();
    var date = dateTime.split(" ")[0].split("/").reverse().join("-");
    var time = dateTime.split(" ")[1];
    var hours = time.split(":")[0];
    //it is pm if hours from 12 onwards
    var suffix = (hours >= 12) ? 'PM' : 'AM';

    //only -12 from hours if it is greater than 12 (if not back at mid night)
    hours = (hours > 12) ? hours - 12 : hours;

    //if 00 then it is 12 am
    hours = (hours == '00') ? 12 : hours;

    time = hours + ":" + time.split(":")[1] + suffix;
    // console.log(date);
    // console.log(time);
    // console.log(noOfLectures);
    // console.log(lectureType);
    // console.log($('input#section.form-control').val().trim().toUpperCase());
    // console.log($('input#courseId.form-control').val().trim());
    // console.log($('input#totalStudents.form-control').val().trim());
    // console.log($('input#token.form-control').val().trim());
    $.ajax({
        type: 'POST',
        dataType: 'json',
        url: 'https://attendance-portal.herokuapp.com/api/attendance-tokens',
        data: {
            "course": $('input#courseId.form-control').val().trim(),
            'section': $('input#section.form-control').val().trim().toUpperCase(),
            'date': date,
            'time': time,
            'noOfLectures': noOfLectures,
            'lectureType': lectureType,
            'totalStudents': $('input#totalStudents.form-control').val().trim(),
            'noOfTokens': $('input#token.form-control').val().trim()
        },
        headers: {
            'authorization-token': globalObject.authToken
        },
        success: function (data) {
            $('div#all-tokens-wrapper.row').empty();
            data.forEach(function (element) {
                let box = document.createElement("div");
                box.setAttribute('class', 'col-md-6 col-md-offset-3 col-sm-12');
                box.innerHTML += "<center><h3>" + element.token + " - " + element.token_issued + "</h3></center>";
                $('div#all-tokens-wrapper.row').append(box);
            }, this);

        },
        error: function (error) {
            alert(error.responseJSON.message);
        }
    });
});

$('button#mark-attendance.btn.btn-success').click(function () {
    $.ajax({
        type: 'PUT',
        dataType: 'json',
        url: 'https://attendance-portal.herokuapp.com/api/attendance/student',
        data: {
            'attendanceToken': $('input#token.form-control').val().trim(),
            'course': $('input#course.form-control').val().trim(),
            'rating': ratingMap[globalObject.lectureRating],
            'feedback': $('input#feedback.form-control').val().trim()
        },
        headers: {
            'authorization-token': globalObject.authToken
        },
        success: function (data) {
            alert(data);
        },
        error: function (error) {
            alert(error.responseText);
        }
    });
});

$('input.star-rating').click(function () {
    globalObject.lectureRating = $(this).attr('id');
});

$('button#log-out.btn.btn-warning').click(function() {
    $.ajax({
        type: 'PUT',
        dataType: 'json',
        url: 'https://attendance-portal.herokuapp.com/api/logout',
        headers: {
            'authorization-token': globalObject.authToken
        },
        success: function (data) {
            localStorage.removeItem('authToken');
            window.location.replace("https://attendance-portal.herokuapp.com");
        },
        error: function (error) {
            alert(error.responseText);
        }
    });
});

$('#course-wrapper').on("click", "button.btn.btn-success.view-student-attendance", function () {
    globalObject.course = $(this).attr("id");

    $('div#attendance-wrapper').empty();

    var loader = document.createElement('div');
    loader.setAttribute('class', 'loader');
    $('div#attendance-wrapper').append(loader);
    $.ajax({
        type: 'GET',
        dataType: 'json',
        url: "https://attendance-portal.herokuapp.com/api/attendance/student?course=" + $(this).attr("id"),
        headers: {
            'authorization-token': globalObject.authToken
        },
        success: function (data) {
            console.log(data);
            $('div#attendance-wrapper').empty();
            var htmlString = `<center>
            <h3 id="course-name">` + globalObject.course + `</h4>
        </center>
        <div class="row>">
            <center><h4 class="col-lg-6 col-sm-12">Total lectures : ` + data.totalLectures + `</h5></center>
            <center><h4 class="col-lg-6 col-sm-12">Lectures Attended : ` + data.lecturesAttended + `</h5></center>
        </div>
        <div class="row">
            <div class="col-lg-12 col-sm-12">`;

            if (data.percentage.substring(0, data.percentage.length - 1) < 50) {
                htmlString += `<div id="attendance-bar" class="w3-container w3-padding-small w3-center w3-red" style="width: ` + data.percentage + `;">` + data.percentage + `</div>`;
            } else if (data.percentage.substring(0, data.percentage.length - 1) < 75) {
                htmlString += `<div id="attendance-bar" class="w3-container w3-padding-small w3-center w3-yellow" style="width: ` + data.percentage + `;">` + data.percentage + `</div>`;
            } else {
                htmlString += `<div id="attendance-bar" class="w3-container w3-padding-small w3-center w3-green" style="width: ` + data.percentage + `;">` + data.percentage + `</div>`;
            }

            htmlString += `</div>
        </div>
        <div class="row" id="attendance-details">`;
            data.attendance.forEach(function (element) {
                htmlString += `<div class="col-lg-3 col-sm-12">
                    <center><div class="thumbnail">
                    <div class="container-fluid">
                            <div class="caption">
                                <h4>` + element.date + `</h4>
                                <h4>` + element.time + `</h4 >
                                <div class="row">
                                    <div class="col-lg-6 col-sm-6">` + element.no_of_lectures + ` Lectures</div>
                                    <div class="col-lg-6 col-sm-6">` + element.lecture_type + `</div>
                                </div>`;
                if (element.is_present === true) {
                    htmlString += `<h3 style="color: green;">Present</h3></div></div></div></center></div>`;
                } else {
                    htmlString += `<h3 style="color: red;">Absent</h3></div></div></div></center></div>`;
                }
            })

            htmlString += `</div>
        </div>`;
            $('div#attendance-wrapper').append(htmlString);
        },
        error: function (error) {
            $('div#attendance-wrapper').empty();
            alert(error.responseText);
        }
    });
});