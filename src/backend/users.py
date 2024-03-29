#!/usr/bin/env python3
import os
import sqlite3
import scrypt

ANNOTATIONS_DB = os.environ["ANNOTATIONS_DB"]


def get_hashed_password(plain_text_password):
    # Hash a password for the first time
    #   (Using scrypt, the salt is saved into the hash itself)
    return scrypt.hashpw(plain_text_password, scrypt.gensalt())


def check_password(plain_text_password, hashed_password):
    # Check hashed password. Using scrypt, the salt is saved into the hash itself
    return scrypt.checkpw(plain_text_password, hashed_password)


def query_db(query, params=()):
    with sqlite3.connect(ANNOTATIONS_DB) as conn:
        conn.row_factory = sqlite3.Row
        results = conn.execute(query, params)
        records = [dict(r) for r in results]
    return records


def authenticate_user(userid, plain_password):
    """Authenticates user password"""
    query = "SELECT userid, password FROM users WHERE userid = :userid;"
    params = dict(userid=userid)
    user = query_db(query, params)
    if len(user) == 0:
        return False
    password = user[0]["password"]
    return check_password(plain_password, password)


def add_user(userid, plain_password):
    """Adds new user"""
    hashed_pw = get_hashed_password(plain_password)
    with sqlite3.connect(ANNOTATIONS_DB) as conn:
        check = "SELECT userid FROM users WHERE userid = :userid;"
        result = conn.execute(check, dict(userid=userid))
        if len(result.fetchall()) > 0:
            return False
        insert = "INSERT INTO users (userid, password) VALUES (:userid, :password);"
        conn.execute(insert, dict(userid=userid, password=hashed_pw))
        return True


def init_users_db():
    with sqlite3.connect(ANNOTATIONS_DB) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users
            (
                rowid INTEGER PRIMARY KEY,
                userid TEXT,
                password TEXT,
                UNIQUE (userid)
            );
        """
        )
