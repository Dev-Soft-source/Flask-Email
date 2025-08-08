from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_mysqldb import MySQL
from functools import wraps
from werkzeug.security import generate_password_hash
from werkzeug.security import check_password_hash
from datetime import datetime
from imapclient import IMAPClient
from email import policy
from email.parser import BytesParser
from dotenv import load_dotenv
import imaplib 
import os, jwt
#import datetime
# Load .env
load_dotenv()

import config

app = Flask(__name__, static_folder="../frontend/build", static_url_path="/")
CORS(app)

# MySQL configuration
app.config['MYSQL_HOST'] = config.MYSQL_HOST
app.config['MYSQL_USER'] = config.MYSQL_USER
app.config['MYSQL_PASSWORD'] = config.MYSQL_PASSWORD
app.config['MYSQL_DB'] = config.MYSQL_DB

mysql = MySQL()
mysql.init_app(app)

@app.route("/")
@app.route("/admin")
@app.route("/user/detail/<int:id>")
def serve(id = None):
    return send_from_directory(app.static_folder, "index.html")

def get_user_id_from_token(token):
    ip = request.remote_addr
    user_agent = request.headers.get('User-Agent')
    if not token:
        return None
    
    try:
        data = jwt.decode(token,  ip + user_agent, algorithms=["HS256"])
        return data['user_id']
    except:
        return jsonify({'error': 'Invalid token'}), 401

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization', None)
        user_id = get_user_id_from_token(token)      

        cur = mysql.connection.cursor()
        cur.execute("SELECT session_token FROM users WHERE id=%s", (user_id,))
        user = cur.fetchone()
        cur.close()

        if not user or user[0] != token:
            return jsonify({'error': 'Session expired (another login detected)'}), 403

        return f(*args, **kwargs)
    return decorated

################## API FOR  DASHBOARD ###############################
@app.route('/api/emails', methods=['GET'])
@token_required
def get_emails():

    token = request.headers.get('Authorization', None)
    ip = request.remote_addr
    user_agent = request.headers.get('User-Agent')
    if not token:
        return jsonify({'error': 'Token is missing'}), 401

    try:
        data = jwt.decode(token,  ip + user_agent, algorithms=["HS256"])
        user_id = data['user_id']
    except:
        return jsonify({'error': 'Invalid token'}), 401       

    cur = mysql.connection.cursor()
    cur.execute("SELECT is_admin FROM users WHERE id = %s", (user_id,))
    user = cur.fetchone()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    cur.execute("SELECT id,email FROM check_email_address WHERE user_id = %s ORDER BY id ASC LIMIT 10", (user_id,))
    address_info = cur.fetchall()

    #Query 2: Overall email stats
    cur.execute("""SELECT sum_inbox, sum_spam, ROUND((sum_inbox / (sum_inbox + sum_spam)) * 100, 1) AS total_percent FROM ( SELECT SUM(inbox) AS sum_inbox, SUM(spam) AS sum_spam  FROM email_check_log ) AS totals""")

    total_info = cur.fetchone()
    cur.close()
    result = []
    for acc in address_info:
        cleaned_email = acc[1].replace('\r', '').replace('\n', '').strip()
        result.append({"id": acc[0], "email": cleaned_email})      
    
    return jsonify({"status": "OK", "results": result, "total_info":total_info, "is_admin": user[0]})


def check_email_status(gmail_email, app_password, from_email_or_name):
    result = {"inbox": False, "spam": False, "not_found": True, "diff_time": ""}
    
    # List of folders to search
    folders = ["INBOX", "[Gmail]/Spam"]

    def short_date(date):
        
        try:
            if date is None:
                return ""
            now = datetime.now()
            diff = now - date
            if diff.total_seconds() < 60:
                return "Just now"
            elif diff.total_seconds() < 3600:
                return f"{int(diff.total_seconds() // 60)} minutes ago"
            elif diff.total_seconds() < 86400:
                return f"{int(diff.total_seconds() // 3600)} hours ago"
            else:
                return f"{diff.days} days ago"
        except Exception as e:
            return "Unknown"
        
    def find_email():
        try:
            
            def fetch_emails(client, folder, search_text, limit):
                client.select_folder(folder)
                criteria = ['ALL'] if not search_text else ['FROM', search_text]
                uids = client.search(criteria)
                uids = uids[-limit:]  # take last `limit` emails
                messages = client.fetch(uids, ['ENVELOPE', 'X-GM-LABELS'])
                results = []
                for uid, data in messages.items():
                    envelope = data[b'ENVELOPE']
                    subject = envelope.subject.decode() if envelope.subject else "(No subject)"
                    sender = f"{envelope.from_[0].mailbox.decode()}@{envelope.from_[0].host.decode()}"
                    sender_name = envelope.from_[0].name.decode() if envelope.from_[0].name else "(No name)"

                    labels = [l.decode() for l in data.get(b'X-GM-LABELS', [])]
        
                    # Fetch full raw email for body parsing
                    raw_data = client.fetch([uid], ['RFC822'])[uid][b'RFC822']
                    msg = BytesParser(policy=policy.default).parsebytes(raw_data)
                    
                    # Extract plain text and html bodies
                    text_body = None
                    html_body = None
                    if msg.is_multipart():
                        for part in msg.walk():
                            ct = part.get_content_type()
                            if ct == "text/plain" and text_body is None:
                                text_body = part.get_content()
                            elif ct == "text/html" and html_body is None:
                                html_body = part.get_content()
                    else:
                        if msg.get_content_type() == "text/plain":
                            text_body = msg.get_content()
                        elif msg.get_content_type() == "text/html":
                            html_body = msg.get_content()
                    results.append({
                        "folder": folder,
                        "date": envelope.date,
                        "sender": sender,
                        "sender_name": sender_name,
                        "subject": subject,
                        "labels": [l.decode() for l in data.get(b'X-GM-LABELS', [])],
                        "text_body": text_body,
                        "html_body": html_body
                    })
                return results
                        
            with IMAPClient('imap.gmail.com', port=993, ssl=True) as client:
                client.login(gmail_email, app_password)
                
                inbox_emails = fetch_emails(client, "INBOX", from_email_or_name, 10)
                spam_emails = fetch_emails(client, "[Gmail]/Spam", from_email_or_name, 10)
                
                all_emails = inbox_emails + spam_emails
                # Sort combined by date (newest first)
                all_emails.sort(key=lambda x: x['date'], reverse=True)

                return [{"folder": "INBOX", "emails": inbox_emails}, {"folder": "SPAM", "emails": spam_emails}]

        except imaplib.IMAP4.error as e:
            print(f"IMAP error occurred while accessing folder : {e}")
            return False
        except Exception as e:
            print(f"Unexpected error while accessing folder : {e}")
            return False

    # Loop through each folder
    results = []
    # Check each folder for the email
    # results = [{"inbox": 0, "spam": 0, "not_found": 0, "diff_time": "", "text": "", "sender": ""}]
    inbox_count = 0
    spam_count = 0  
        
    received_list = find_email()  # Pass the folder variable here

    if received_list == False:
        return {'results':[], 'inbox': 0, 'spam': 0, 'not_found': 1, 'type': 'invalid'}

    for received in received_list:
        email_count = 0
        for email in received['emails']:
            email_count += 1
            result = {}
            result["type"] = "inbox" if received['folder'] == "INBOX" else "spam"
            result["diff_time"] = short_date(email['date'])
            result["date"] = email['date']
            MAX_SAFE_SIZE = 35
            content = email['text_body'] or ''
            if len(content) > MAX_SAFE_SIZE:
                content = content[:MAX_SAFE_SIZE] + "..."
            result["text"] = content
            result["subject"] = email['subject']
            result["sender_email"] = email['sender']
            result["sender_name"] = email['sender_name']
            results.append(result)            
        # Count emails in each folder
        inbox_count += email_count if received['folder'] == "INBOX" else 0
        spam_count += email_count if received['folder'] == "SPAM" else 0

    return {'results': results, 'email': gmail_email, 'inbox': inbox_count, 'spam': spam_count, 'not_found': 0 if inbox_count + spam_count > 0 else 1, 'type': 'valid'}

@app.route('/api/check', methods=['POST'])
@token_required
def check_email():

    data = request.json
    from_name_or_email = data.get("search")
    account_email = data.get("email")

    user_id = get_user_id_from_token(request.headers.get('Authorization'))

    cur = mysql.connection.cursor()
    cur.execute("SELECT id, password FROM check_email_address WHERE email = %s", (account_email,))
    account_email_info = cur.fetchone()
    
    # for acc in address_info:
    # Check email status for each account
    status_list = check_email_status(account_email, account_email_info[1], from_name_or_email)

    cur.execute("INSERT INTO email_check_log (user_id, address_id, inbox, spam, checked_at) VALUES (%s, %s, %s, %s, %s)",
                (user_id, account_email_info[0], status_list['inbox'], status_list['spam'], datetime.now().strftime('%Y-%m-%d %H:%M:%S')))
    mysql.connection.commit()
    cur.close()
    return jsonify({"status": "OK", "results": status_list})

################## API FOR  USERS MANAGE #################################
### get user list for admin
@app.route('/api/users', methods=['GET'])
@token_required
def get_users():

    token = request.headers.get('Authorization', None)
    ip = request.remote_addr
    user_agent = request.headers.get('User-Agent')
    if not token:
        return jsonify({'error': 'Token is missing'}), 401

    try:
        data = jwt.decode(token,  ip + user_agent, algorithms=["HS256"])
        user_id = data['user_id']
    except:
        return jsonify({'error': 'Invalid token'}), 401       
    percent = "%"
    cur = mysql.connection.cursor()
    cur.execute("""SELECT id, username, is_admin, t1.* FROM users LEFT JOIN (
       SELECT   
           user_id,  
           IFNULL(SUM(inbox), 0) AS inbox,  
           IFNULL(SUM(spam), 0) AS spam,  
           IFNULL(SUM(inbox) + SUM(spam), 0) AS total,  
           CONCAT(ROUND(IFNULL(SUM(inbox) * 100 / NULLIF(SUM(inbox) + SUM(spam), 0), 0), 1), '%') AS ratio FROM email_check_log GROUP BY user_id) AS t1 ON t1.user_id = users.id""")
    rows = cur.fetchall()

    column_names = [desc[0] for desc in cur.description]

    # Convert each row to dict and format datetime
    users = []
    for row in rows:
        user = dict(zip(column_names, row))
        for key, value in user.items():
            if isinstance(value, datetime):
                user[key] = value.isoformat()
        users.append(user)
    
     # Query 2: Overall email stats
    # cur.execute("""SELECT sum_inbox, sum_spam, ROUND((sum_inbox / (sum_inbox + sum_spam)) * 100, 1) AS total_percent FROM ( SELECT SUM(inbox) AS sum_inbox, SUM(spam) AS sum_spam  FROM email_check_log ) AS totals""")

    # total_info = cur.fetchone()
    # cur.close()
    #return jsonify(users) 
    return jsonify({"status": "OK", "results": users})

# 🔸 Create User (POST /api/users)
@app.route('/api/users', methods=['POST'])
@token_required
def create_user():
    data = request.get_json()
    username = data.get('username')
    is_admin = data.get('is_admin')
    password = data.get('password')
    
    if not username or is_admin is None:
        return jsonify({'error': 'Missing required fields'}), 400
    password_hash = generate_password_hash(password)
    cur = mysql.connection.cursor()
    cur.execute("INSERT INTO users (username, is_admin, password_hash) VALUES (%s, %s,%s)", (username, is_admin, password_hash))
    mysql.connection.commit()

    user_id = cur.lastrowid
    cur.close()

    return jsonify({'id': user_id, 'username': username, 'is_admin': is_admin}), 201

# 🔸 Update User (PUT /api/users/<id>)
@app.route('/api/users/<int:id>', methods=['PUT'])
@token_required
def update_user(id):
    data = request.get_json()
    username = data.get('username')
    is_admin = data.get('is_admin')
    password = data.get('password')
    if not username or is_admin is None:
        return jsonify({'error': 'Missing required fields'}), 400
    password_hash = generate_password_hash(password)
    cur = mysql.connection.cursor()
    cur.execute("UPDATE users SET username=%s, is_admin=%s, password_hash=%s WHERE id=%s", (username, is_admin, password_hash, id))

    mysql.connection.commit()
    cur.close()

    return jsonify({'id': id, 'username': username, 'is_admin': is_admin}), 200
# 🔸 Delete User (DELETE /api/users/<id>)

@app.route('/api/users/<int:id>', methods=['DELETE'])
@token_required
def delete_user(id):
    cur = mysql.connection.cursor()

    # Optional: check if user exists
    cur.execute("SELECT * FROM users WHERE id = %s", (id,))
    user = cur.fetchone()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    # Delete user
    cur.execute("DELETE FROM users WHERE id = %s", (id,))
    mysql.connection.commit()
    cur.close()

    return jsonify({'message': 'User deleted'}), 200
################## API FOR USER DETAIL(MAIL) ###############################
# get user mail detail data 
@app.route('/api/user/<int:id>', methods=['GET'])
@token_required
def get_user_mail(id):

    token = request.headers.get('Authorization', None)
    ip = request.remote_addr
    user_agent = request.headers.get('User-Agent')
    if not token:
        return jsonify({'error': 'Token is missing'}), 401

    try:
        data = jwt.decode(token,  ip + user_agent, algorithms=["HS256"])        
    except:
        return jsonify({'error': 'Invalid token'}), 401       

    cur = mysql.connection.cursor()
    cur.execute("SELECT id,user_id, email,password FROM check_email_address WHERE user_id = %s", (id,))
    rows = cur.fetchall()

    column_names = [desc[0] for desc in cur.description]

    # Convert each row to dict and format datetime
    mails = []
    for row in rows:
        user = dict(zip(column_names, row))
        for key, value in user.items():
            if isinstance(value, datetime):
                user[key] = value.isoformat()
        mails.append(user)

    #return jsonify(mails) 
    return jsonify({"status": "OK", "results": mails})

@app.route('/api/reset_all_data', methods=['GET'])
@token_required
def reset_all_data():
    cur = mysql.connection.cursor()
    cur.execute("DELETE FROM email_check_log")
    mysql.connection.commit()
    cur.close()
    return jsonify({"status": "OK"})

# save user mail detail data 
@app.route('/api/user', methods=['POST'])
@token_required
def create_user_mail():
    data = request.get_json()
    email = data.get('email')
    user_id = data.get('user_id')
    password = data.get('password')

    if not email or not password:
        return jsonify({'status': 'ERROR', 'message': 'Missing fields'}), 400
    
    cur = mysql.connection.cursor()
    cur.execute("INSERT INTO check_email_address (email, password,user_id) VALUES (%s, %s,%s)", (email, password,user_id))
    mysql.connection.commit()
    mail_id = cur.lastrowid
    cur.close()

    return jsonify({'status': 'OK', 'results': {'id': mail_id, 'email': email, 'password': password}}), 201
# update user mail detail data 
@app.route('/api/user/<int:id>', methods=['PUT'])
@token_required
def update_user_mail(id):
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({'status': 'ERROR', 'message': 'Missing fields'}), 400

    cur = mysql.connection.cursor()
    cur.execute("UPDATE check_email_address SET email = %s, password = %s WHERE id = %s", (email, password, id))
    mysql.connection.commit()
    cur.close()

    return jsonify({'status': 'OK', 'results': {'id': id, 'email': email, 'password': password}})
# delete user mail detail data 
@app.route('/api/user/<int:id>', methods=['DELETE'])
def delete_user_mail(id):
    cur = mysql.connection.cursor()
    cur.execute("DELETE FROM check_email_address WHERE id = %s", (id,))
    mysql.connection.commit()
    cur.close()
    return jsonify({'status': 'OK', 'message': 'User deleted'})

################## API FOR AUTH ###############################

def token_compare(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization', None)
        if not token:
            # let assume that only one user is on the user table
            cur = mysql.connection.cursor()
            cur.execute("SELECT session_token FROM users LIMIT 1")
            user = cur.fetchone()
            cur.close()
            if not user:
                return jsonify({'error': 'No user found'}), 401
            elif user[0] != None and user[0] != '':
                return jsonify({'error': 'Session expired (another login detected)'}), 403
            else:
                # If token is empty, we assume the user is not logged in
                return f(*args, **kwargs)
        else:
            try:
                data = jwt.decode(token,  os.getenv("SECRET_KEY"), algorithms=["HS256"])
                user_id = data['user_id']
            except:
                return jsonify({'error': 'Invalid token'}), 401

            cur = mysql.connection.cursor()
            cur.execute("SELECT session_token FROM users WHERE id=%s", (user_id,))
            user = cur.fetchone()
            cur.close()

            if not user or user[0] != token:
                return jsonify({'error': 'Session expired (another login detected)'}), 403

            return f(*args, **kwargs)
    return decorated

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = data.get("username")
    password = data.get("password")
    ip = request.remote_addr
    user_agent = request.headers.get('User-Agent')

    cur = mysql.connection.cursor()
    cur.execute("SELECT id, password_hash, session_token FROM users WHERE username=%s", (username,))
    user = cur.fetchone()

    if not user:
        return jsonify({"error": "Unregister"}), 401  # 401 Unauthorized is more appropriate

    user_id, password_hash, session_token = user

    token = jwt.encode({"user_id": user_id}, ip + user_agent, algorithm="HS256")

    if session_token and session_token != '':   
        if not session_token ==  token:
            return jsonify({"error": "Session expired"}), 403

    if not check_password_hash(password_hash, password):
        return jsonify({"error": "Invalid credentials"}), 401    

    cur.execute("UPDATE users SET session_token=%s WHERE id=%s", (token, user_id))
    mysql.connection.commit()
    return jsonify({"token": token})

@app.route("/api/logout", methods=["POST"])
@token_required
def logout():
    user_id = get_user_id_from_token(request.headers.get('Authorization'))

    if not user_id:
        return jsonify({"error": "Missing User ID"}), 401

    cur = mysql.connection.cursor()
    cur.execute("UPDATE users SET session_token = NULL WHERE id = %s", (user_id,))
    mysql.connection.commit()
    cur.close()

    return jsonify({"status": "OK", "message": "Logout success"}), 200




if __name__ == "__main__":
    #app.run(host="0.0.0.0", port=5000, debug=True)
    app.run(host='0.0.0.0', port=8000)