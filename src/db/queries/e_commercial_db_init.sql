DROP DATABASE IF EXISTS e_commercial_db;

CREATE DATABASE IF NOT EXISTS e_commercial_db;

USE e_commercial_db;

CREATE TABLE Users (
    id INTEGER PRIMARY KEY AUTO_INCREMENT NOT NULL,
    fullname VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    register_date VARCHAR(55) NOT NULL
);

CREATE TABLE UserDetails (
    phone VARCHAR(255) UNIQUE,
    birthday DATE,
    bio VARCHAR(510),
    email_registered BOOL NOT NULL,
    preferred_lang VARCHAR(50),
    user_id INTEGER PRIMARY KEY UNIQUE NOT NULL,
    FOREIGN KEY (user_id) REFERENCES Users (id) ON DELETE CASCADE
);

CREATE TABLE TokenSessions (
    id INTEGER PRIMARY KEY AUTO_INCREMENT NOT NULL,
    created_for VARCHAR(55) NOT NULL,
    token VARCHAR(255) NOT NULL,
    payload JSON NOT NULL,
    expired_in VARCHAR(55) NOT NULL,
    owner_id INTEGER NOT NULL,
    FOREIGN KEY (owner_id) REFERENCES UserDetails (user_id) ON DELETE CASCADE
);