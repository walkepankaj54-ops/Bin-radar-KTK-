"""Command-line menu for managing student records in app.db."""

from database import (
    add_student,
    delete_student,
    initialize_database,
    search_students_by_name,
    update_student,
    view_all_students,
)


# Print rows in a readable format shared by View and Search.
def print_students(students: list) -> None:
    if not students:
        print("No student records found.")
        return

    print("\nID | Name | Email | Course | Created at")
    print("-" * 88)
    for student in students:
        print(
            f"{student['id']} | {student['name']} | {student['email']} | "
            f"{student['course']} | {student['created_at']}"
        )


# Ask for a positive numeric ID and explain invalid input clearly.
def ask_for_id() -> int | None:
    entered_id = input("Student ID: ").strip()
    try:
        student_id = int(entered_id)
    except ValueError:
        print("Please enter a valid whole-number ID.")
        return None

    if student_id <= 0:
        print("ID must be greater than zero.")
        return None
    return student_id


# Run one menu choice and keep errors friendly for new users.
def handle_choice(choice: str) -> bool:
    try:
        if choice == "1":
            name = input("Name: ")
            email = input("Email: ")
            course = input("Course: ")
            student_id = add_student(name, email, course)
            print(f"Student added successfully with ID {student_id}.")
        elif choice == "2":
            print_students(view_all_students())
        elif choice == "3":
            name = input("Search name: ")
            print_students(search_students_by_name(name))
        elif choice == "4":
            student_id = ask_for_id()
            if student_id is None:
                return True
            name = input("New name: ")
            email = input("New email: ")
            course = input("New course: ")
            if update_student(student_id, name, email, course):
                print("Student updated successfully.")
            else:
                print(f"No student was found with ID {student_id}.")
        elif choice == "5":
            student_id = ask_for_id()
            if student_id is None:
                return True
            if delete_student(student_id):
                print("Student deleted successfully.")
            else:
                print(f"No student was found with ID {student_id}.")
        elif choice == "6":
            print("Goodbye.")
            return False
        else:
            print("Please choose a number from 1 to 6.")
    except ValueError as error:
        print(f"Could not save that record: {error}")

    return True


# Create the database once, then repeat the menu until Exit is selected.
def main() -> None:
    initialize_database()
    print("Student records - SQLite CLI")
    while True:
        print("\n1. Add\n2. View all\n3. Search\n4. Update\n5. Delete\n6. Exit")
        choice = input("Choose an option: ").strip()
        if not handle_choice(choice):
            break


if __name__ == "__main__":
    main()
