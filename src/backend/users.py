#!/usr/bin/env python3
import os
import psycopg
from passlib.hash import bcrypt
from psycopg.rows import dict_row
from .data_utils import CONN_STR, query_db

hasher = bcrypt.using(13)


def get_hashed_password(plain_text_password):
    hashed_password = hasher.hash(plain_text_password)
    return hashed_password


def check_password(plain_text_password, hashed_password):
    # Check hashed password. Using passlib, the salt is saved into the hash itself
    return hasher.verify(plain_text_password, hashed_password)


def authenticate_user(userid, plain_password):
    """Authenticates user password"""
    query = "SELECT userid, password FROM users WHERE userid = %(userid)s;"
    params = dict(userid=userid)
    user = query_db(query, params)
    if len(user) == 0:
        return False
    password = user[0]["password"]
    return check_password(plain_password, password)


def add_user(userid, plain_password):
    """Adds new user"""
    hashed_pw = get_hashed_password(plain_password)
    with psycopg.connect(CONN_STR, row_factory=dict_row) as conn:
        check = "SELECT userid FROM users WHERE userid = %(userid)s;"
        result = conn.execute(check, dict(userid=userid))
        if len(result.fetchall()) > 0:
            return False
        insert = "INSERT INTO users (userid, password) VALUES (%(userid)s, %(password)s);"
        conn.execute(insert, dict(userid=userid, password=hashed_pw))
        return True


def init_users_db():
    with psycopg.connect(CONN_STR, row_factory=dict_row) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users
            (
                rowid SERIAL PRIMARY KEY,
                userid TEXT,
                password TEXT,
                UNIQUE (userid)
            );
        """
        )
