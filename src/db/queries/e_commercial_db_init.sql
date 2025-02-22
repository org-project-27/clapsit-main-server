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

CREATE TABLE Brands (
    brand_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL UNIQUE,
    logo VARCHAR(255) NOT NULL,
    website VARCHAR(255) NOT NULL,
    bio TEXT,
    owner_id INT NOT NULL,
    FOREIGN KEY (owner_id) REFERENCES Users (id) ON DELETE CASCADE
);

CREATE TABLE PlaceListType (
    id INT PRIMARY KEY AUTO_INCREMENT,
    value VARCHAR(255) NOT NULL
);

CREATE TABLE PlacesList (
    place_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    type INT NOT NULL,
    address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    zip_code VARCHAR(20) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL,
    opening_hours VARCHAR(255) NOT NULL,
    brand_id INT NOT NULL,
    FOREIGN KEY (brand_id) REFERENCES Brands (brand_id) ON DELETE CASCADE,
    FOREIGN KEY (type) REFERENCES PlaceListType (id) ON DELETE CASCADE
);

CREATE TABLE ServicesList (
    service_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2),
    category_id INT,
    place_id INT NOT NULL,
    FOREIGN KEY (place_id) REFERENCES PlacesList (place_id) ON DELETE CASCADE
);