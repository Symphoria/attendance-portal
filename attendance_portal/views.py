# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from .models import *
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import api_view
from .serializers import *
from django.utils import timezone
from django.utils.crypto import get_random_string
from datetime import timedelta, datetime
from .permissions import *
from .helper_functions import *


class UserLoginView(APIView):
    def post(self, request):
        user_type = request.data['userType']

        if 'HTTP_AUTHORIZATION_TOKEN' in request.META and Session.objects.filter(
                auth_token=request.META['HTTP_AUTHORIZATION_TOKEN'],
                expires_at__gte=datetime.now(),
                user_type=user_type).exists():
            return Response({"message": "User already logged in"}, status=status.HTTP_200_OK)
        else:
            username = request.data['userName'].lower()
            password = request.data['password']
            # NOTE The following code is only meant for development purposes until ldap login function is tested against
            # the university ldap server.
            # When the function is battle-tested, uncomment the following line and comment out statement after that
            # is_user = authenticate_user(username, password, user_type)
            is_user = password == "pass"
            first_name = request.data['firstName']
            last_name = request.data['lastName']
            email = request.data['email']

            if is_user:
                auth_token = get_random_string(length=64,
                                               allowed_chars=u'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789')
                if user_type == 'professor':
                    user = Professor.objects.filter(professor_id=username).first()
                    if user:
                        user_id = user.id
                    else:
                        new_user = Professor.objects.create(professor_id=username, first_name=first_name,
                                                            last_name=last_name, email=email)
                        user_id = new_user.id
                else:
                    user = Student.objects.filter(enrollment_no=username).first()
                    if user is not None:
                        user_id = user.id
                    else:
                        new_user = Student.objects.create(enrollment_no=username, first_name=first_name,
                                                          last_name=last_name, email=email, is_active=True)
                        user_id = new_user.id

                Session.objects.create(auth_token=auth_token, user_id=user_id, user_type=user_type,
                                       expires_at=timezone.now() + timedelta(hours=4))
                payload = {
                    "authToken": auth_token,
                    "userId": username,
                    "userType": user_type
                }

                return Response(payload, status=status.HTTP_200_OK)
            else:
                return Response({"message": "Given Credentials are wrong"}, status=status.HTTP_400_BAD_REQUEST)


class StudentView(APIView):
    permission_classes = (IsStudent,)

    def put(self, request):
        student = request.user
        first_name = str(request.data['name']).split()[0]
        last_name = str(request.data['name']).split()[1]

        if student.is_active is True:
            student.first_name = first_name
            student.last_name = last_name
            student.email = request.data['email']
            student.current_semester = request.data['currentSemester']
            student.graduation_year = request.data['graduationYear']
            student.save()

            return Response("Student info updated", status=status.HTTP_200_OK)
        else:
            return Response("The student does not exist", status=status.HTTP_404_NOT_FOUND)

    def get(self, request):
        roll_no = request.user.enrollment_no
        student = Student.objects.filter(enrollment_no=roll_no, is_active=True).first()

        if student:
            course_id_list = student.studentcourse_set.filter(semester=student.current_semester).values_list(
                'course_id', flat=True)
            course_obj_list = Course.objects.filter(pk__in=course_id_list)
            courses = CourseSerializer(instance=course_obj_list, many=True).data
            student_info = StudentSerializer(instance=student).data
            payload = {
                "studentInfo": student_info,
                "coursesTaken": courses
            }

            return Response(payload, status=status.HTTP_200_OK)
        else:
            return Response({"message": "Student does not exist"}, status=status.HTTP_404_NOT_FOUND)


class StudentCourseView(APIView):
    permission_classes = (IsStudent,)

    def put(self, request):
        semester = request.data['semester']
        course = request.data['course']
        section = request.data['section'].upper();
        student = request.user
        student.current_semester = semester
        student.save()
        a_course = Course.objects.filter(course_code=course.lower()).first()

        if a_course:
            student_course = StudentCourse.objects.filter(student=student, course=a_course, semester=semester).first()

            if student_course:
                student_course.section = section
                student_course.save()
            else:
                StudentCourse.objects.create(student=student, course=a_course, semester=semester, section=section)

            return Response("Courses updated", status=status.HTTP_200_OK)
        else:
            return Response("The entered course does not exist", status=status.HTTP_404_NOT_FOUND)

    def delete(self, request):
        semester = request.data['semester']
        course = request.data['course']
        section = request.data['section'].upper()
        student = request.user
        a_course = Course.objects.filter(course_code=course.lower()).first()

        if a_course:
            student_course = StudentCourse.objects.filter(student=student, course=a_course, section=section,
                                                          semester=semester).first()

            if student_course:
                student_course.delete()

                return Response("Courses updated", status=status.HTTP_200_OK)
            else:
                return Response("Student is not registered for this course", status=status.HTTP_404_NOT_FOUND)
        else:
            return Response("The entered course does not exist", status=status.HTTP_404_NOT_FOUND)


class AttendanceTokenView(APIView):
    permission_classes = (IsProfessor,)

    def post(self, request):
        professor = request.user
        course = Course.objects.filter(course_code=request.data['course'].lower()).first()

        if course:
            datetime_obj = datetime.strptime(request.data['date'] + ' ' + request.data['time'].upper(),
                                             '%d-%m-%Y %I:%M%p')
            lecture = Lecture.objects.filter(course=course, lecture_date=datetime_obj, professor=professor,
                                             no_of_lectures=request.data['noOfLectures'],
                                             lecture_type=request.data['lectureType']).first()

            if lecture:
                attendance_tokens = AttendanceToken.objects.filter(lecture=lecture)
                payload = AttendanceTokenSerializer(instance=attendance_tokens, many=True).data
            else:
                new_lecture = Lecture.objects.create(course=course, lecture_date=datetime_obj, professor=professor,
                                                     no_of_lectures=request.data['noOfLectures'], rating=0,
                                                     lecture_type=request.data['lectureType'])
                payload = get_tokens(int(request.data['totalStudents']), int(request.data['noOfTokens']))
                student_course_obj_list = StudentCourse.objects.filter(course=course,
                                                                       section=request.data['section'].upper(),
                                                                       student__current_semester=course.semester)
                create_obj_list = []

                for student_course_obj in student_course_obj_list:
                    create_obj_list.append(
                        Attendance(student_course=student_course_obj, lecture=new_lecture, rating=0.0))

                Attendance.objects.bulk_create(create_obj_list)

                for token_info in payload:
                    AttendanceToken.objects.create(token=token_info.get('token'), lecture=new_lecture,
                                                   token_issued=token_info['token_issued'])

                course.total_lectures += int(request.data['noOfLectures'])
                course.save()

            return Response(payload, status=status.HTTP_200_OK)
        else:
            return Response({"message": "The entered course does not exist", "course": request.data['course']},
                            status=status.HTTP_404_NOT_FOUND)

    def put(self, request):
        token = request.data['token']
        increase_by = request.data['increaseBy']
        attendance_token_obj = AttendanceToken.objects.filter(token=token).first()

        if attendance_token_obj:
            attendance_token_obj.token_issued += int(increase_by)
            attendance_token_obj.save()

            return Response("Token capacity increased", status=status.HTTP_200_OK)

        return Response("Check the values entered", status=status.HTTP_400_BAD_REQUEST)


class StudentAttendanceView(APIView):
    permission_classes = (IsStudent,)

    def put(self, request):
        student = request.user
        course_code = request.data['course']
        course = Course.objects.filter(course_code=course_code.lower()).first()

        if course:
            token = request.data['attendanceToken']
            attendance_token_obj = AttendanceToken.objects.filter(token=token).first()

            if attendance_token_obj:
                if attendance_token_obj.token_accepted < attendance_token_obj.token_issued:
                    student_course = StudentCourse.objects.get(student=student, course=course)
                    attendance = Attendance.objects.filter(student_course=student_course,
                                                           lecture=attendance_token_obj.lecture).first()

                    if attendance:
                        if attendance.is_present is False:
                            attendance_token_obj.token_accepted += 1
                            attendance_token_obj.save()
                            student_course.lectures_attended += attendance_token_obj.lecture.no_of_lectures
                            student_course.save()
                            attendance.is_present = True
                            attendance.token = token
                            attendance.rating = request.data['rating']
                            attendance.feedback = request.data['feedback']
                            attendance.save()

                            ratings_list = Attendance.objects.filter(student_course=student_course,
                                                                     lecture=attendance.lecture).values_list('rating',
                                                                                                             flat=True)
                            average_rating = sum(ratings_list) / len(ratings_list)
                            attendance_token_obj.lecture.rating = int(round(average_rating))
                            attendance_token_obj.lecture.save()

                            return Response(
                                "Attendance marked of " + student.enrollment_no + " for the course " + course_code,
                                status=status.HTTP_202_ACCEPTED)
                        else:
                            return Response("You do not take this course", status=status.HTTP_406_NOT_ACCEPTABLE)
                    else:
                        return Response("Attendance already marked", status=status.HTTP_406_NOT_ACCEPTABLE)
                else:
                    return Response("The token is no longer valid", status=status.HTTP_406_NOT_ACCEPTABLE)
            else:
                return Response("The entered token is wrong", status=status.HTTP_404_NOT_FOUND)
        else:
            return Response("The entered course is wrong", status=status.HTTP_404_NOT_FOUND)

    def get(self, request):
        student = request.user
        course_code = request.GET['course']
        course = Course.objects.filter(course_code=course_code.lower()).first()

        if course:
            student_course = StudentCourse.objects.filter(student=student, course=course).first()

            if student_course:
                attendance_record = Attendance.objects.filter(student_course=student_course)
                attendance_data = AttendanceSerializer(instance=attendance_record, many=True).data
                lectures_attended = student_course.lectures_attended
                total_lectures = course.total_lectures

                if total_lectures == 0:
                    return Response("No lectures have been scheduled yet", status=status.HTTP_404_NOT_FOUND)

                attendance_percentage = (lectures_attended * 100) / float(total_lectures)
                payload = {
                    "totalLectures": str(total_lectures),
                    "lecturesAttended": str(lectures_attended),
                    "percentage": str(attendance_percentage)[:5] + "%",
                    "attendance": attendance_data
                }

                return Response(payload, status=status.HTTP_200_OK)
            else:
                return Response("The student does not take this course", status=status.HTTP_400_BAD_REQUEST)
        else:
            return Response("The entered course is wrong", status=status.HTTP_404_NOT_FOUND)


class ProfessorCourseView(APIView):
    permission_classes = (IsProfessor,)

    def post(self, request):
        professor = request.user
        course_code = request.data['course']
        course = Course.objects.filter(course_code=course_code.lower()).first()

        if course:
            professor.courses.add(course)

            return Response("Course " + course_code + " added", status=status.HTTP_201_CREATED)
        else:
            return Response("Entered course is wrong", status=status.HTTP_404_NOT_FOUND)

    def get(self, request):
        professor = request.user
        courses = professor.courses.all()
        payload = CourseSerializer(instance=courses, many=True).data

        return Response(payload, status=status.HTTP_200_OK)

    def delete(self, request):
        professor = request.user
        course = Course.objects.filter(course_code=request.data['course'].lower()).first()

        if course:
            professor.courses.remove(course)

            return Response("Course " + request.data['course'] + " removed", status=status.HTTP_200_OK)
        else:
            return Response("Entered course is wrong", status=status.HTTP_404_NOT_FOUND)


class ProfessorAttendanceView(APIView):
    permission_classes = (IsProfessor,)

    def get(self, request):
        professor = request.user
        course_code = request.GET['course'].lower()
        month = request.GET['month']
        section = request.GET['section'].upper()
        course = Course.objects.filter(course_code=course_code).first()

        if course:
            student_course_obj_list = StudentCourse.objects.filter(course=course, section=section)
            rating_list = Lecture.objects.filter(professor_id=professor.id, course_id=course.id).values_list('rating',
                                                                                                             flat=True)

            if len(rating_list) == 0:
                average_rating = 0
            else:
                average_rating = sum(rating_list) / len(rating_list)

            payload = []

            for student_course in student_course_obj_list:
                student = student_course.student
                enrollment_no = student.enrollment_no
                name = student.first_name + ' ' + student.last_name
                attendance = Attendance.objects.filter(student_course=student_course,
                                                       lecture__lecture_date__month=month)

                if not attendance.first():
                    return Response("No classes in the entered month", status=status.HTTP_404_NOT_FOUND)

                attendance_data = AttendanceSerializer(instance=attendance, many=True).data
                content = {
                    "enrollmentNo": enrollment_no,
                    "name": name,
                    "attendanceData": attendance_data
                }
                payload.append(content)

            response = {
                "rating": average_rating,
                "payload": payload
            }

            return Response(response, status=status.HTTP_200_OK)
        else:
            return Response("Entered course is wrong", status=status.HTTP_404_NOT_FOUND)


@api_view(['PUT'])
def logout(request):
    if 'HTTP_AUTHORIZATION_TOKEN' in request.META:
        auth_token = request.META['HTTP_AUTHORIZATION_TOKEN']
        session = Session.objects.filter(auth_token=auth_token).first()

        if session:
            session.expires_at = datetime.now()
            session.save()

            return Response("You are logged out", status=status.HTTP_200_OK)

    return Response("There was something wrong", status=status.HTTP_400_BAD_REQUEST)
