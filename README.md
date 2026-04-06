# 🗄️ Web SQL Studio Pro

A modern, highly responsive, browser-based SQL Server Management Studio (SSMS) simulator built entirely with **Vanilla JavaScript, HTML5, and Pure CSS**. 

No frameworks, no heavy libraries, and no backend required. It runs completely in the browser using an intelligent in-memory database engine and `localStorage` for persistence.

## ✨ Features

* **📱 Super Responsive Design:** Works flawlessly on desktop and mobile devices. Features a slide-in mobile menu and a fully floating, modern UI.
* **🧠 Intelligent Autocomplete (IntelliSense):** Smart SQL typing suggestions that dynamically read your active database schema to suggest table names, column names, and SQL keywords.
* **🗺️ Interactive Database Diagram:** Automatically visualizes your database schema with draggable, touch-friendly Entity-Relationship (ER) cards.
* **💾 Persistent Storage:** Close the tab and come back later. Your databases, tables, and data are automatically saved to your browser's local storage.
* **🌙 Dynamic Theming:** Fully supports System Default, Dark Mode, and Light Mode with a seamless toggle.
* **🏗️ Multi-Database Support:** Create multiple databases, switch contexts using the `USE` command, and isolate your tables.
* **🎨 Pure CSS & Vanilla JS:** Zero dependencies (aside from Phosphor Icons for UI). Fast, lightweight, and easy to modify.

## 🚀 Getting Started

Since this project has zero backend dependencies, running it is incredibly simple:

1. Clone or download this repository.
2. Ensure all three files (`index.html`, `style.css`, `script.js`) are in the same folder.
3. Double-click `index.html` to open it in any modern web browser.

## 💻 Supported SQL Commands

The custom JavaScript SQL parser currently supports the following DDL and DML operations:

* **Database Operations:** * `CREATE DATABASE [Name];`
  * `DROP DATABASE [Name];`
  * `USE [Name];`
* **Table Operations:**
  * `CREATE TABLE [Name] (Col1 TYPE, Col2 TYPE);`
  * `DROP TABLE [Name];`
* **Data Operations:**
  * `INSERT INTO [Name] VALUES ('Val1', 'Val2');`
  * `SELECT * FROM [Name];`

*(Note: This is a frontend simulator. Complex joins, nested queries, and advanced constraints are not currently supported by the mock engine).*

## 📂 Project Structure

* `index.html` - The semantic HTML structure and UI layout.
* `style.css` - All styling, including CSS variables for theming, responsive media queries, and floating component logic.
* `script.js` - The core application logic, including the SQL parser, UI state management, touch/drag events, and IntelliSense engine.

## 🛠️ Built With

* HTML5
* CSS3 (Pure)
* JavaScript (ES6+ Vanilla)
* [Phosphor Icons](https://phosphoricons.com/) (for UI elements)

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the issues page or submit a Pull Request if you want to expand the SQL engine or add new UI features.

## 📝 License

This project is open-source and available under the [MIT License](LICENSE).
