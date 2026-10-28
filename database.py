"""Small SQLite data layer for the BinRadar student database exercise."""

import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator


# Keep the database beside these Python files so the project is easy to move.
DATABASE_PATH = Path(__file__).with_name("app.db")


# Open a connection, create the table if needed, and always close the connection.
@contextmanager
def _connection() -> Iterator[sqlite3.Connection]:
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    try:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS students (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE,
                course TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


# Create the database file and students table before the menu starts.
def initialize_database() -> None:
    with _connection():
        pass


# Add one student and return the new row ID.
def add_student(name: str, email: str, course: str) -> int:
    clean_name = name.strip()
    if not clean_name:
        raise ValueError("Name is required.")

    try:
        with _connection() as connection:
            cursor = connection.execute(
                "INSERT INTO students (name, email, course) VALUES (?, ?, ?)",
                (clean_name, email.strip(), course.strip()),
            )
            return int(cursor.lastrowid)
    except sqlite3.IntegrityError as error:
        if "students.email" in str(error):
            raise ValueError("That email is already in use. Please enter a different email.") from error
        raise ValueError("The student could not be added. Check the information and try again.") from error


# Return every student, newest IDs at the bottom of the result.
def view_all_students() -> list[sqlite3.Row]:
    with _connection() as connection:
        cursor = connection.execute(
            "SELECT id, name, email, course, created_at FROM students ORDER BY id"
        )
        return cursor.fetchall()


# Find students whose names contain the entered text, without matching letter case.
def search_students_by_name(name: str) -> list[sqlite3.Row]:
    search_text = name.strip()
    if not search_text:
        return []

    with _connection() as connection:
        cursor = connection.execute(
            "SELECT id, name, email, course, created_at "
            "FROM students WHERE name LIKE ? COLLATE NOCASE ORDER BY name",
            (f"%{search_text}%",),
        )
        return cursor.fetchall()


# Replace a student's details and return False when the ID does not exist.
def update_student(student_id: int, name: str, email: str, course: str) -> bool:
    if student_id <= 0:
        raise ValueError("Student ID must be a positive whole number.")
    clean_name = name.strip()
    if not clean_name:
        raise ValueError("Name is required.")

    try:
        with _connection() as connection:
            cursor = connection.execute(
                "UPDATE students SET name = ?, email = ?, course = ? WHERE id = ?",
                (clean_name, email.strip(), course.strip(), student_id),
            )
            return cursor.rowcount > 0
    except sqlite3.IntegrityError as error:
        if "students.email" in str(error):
            raise ValueError("That email is already in use. Please enter a different email.") from error
        raise ValueError("The student could not be updated. Check the information and try again.") from error


# Delete one student and return False when the ID does not exist.
def delete_student(student_id: int) -> bool:
    if student_id <= 0:
        raise ValueError("Student ID must be a positive whole number.")

    with _connection() as connection:
        cursor = connection.execute("DELETE FROM students WHERE id = ?", (student_id,))
        return cursor.rowcount > 0
