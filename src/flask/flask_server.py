from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import json
import tempfile
import shutil
from werkzeug.utils import secure_filename
from test import main as process_photos
import traceback
import time  # Add this import

app = Flask(__name__)
CORS(app)  # Enable CORS for React Native

# Configuration
UPLOAD_FOLDER = './temp_uploads'
MODEL_FOLDER = './temp_models'
ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png'}
STATIC_GLB_PATH = './model/dome_sky_model.glb'

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MODEL_FOLDER'] = MODEL_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100MB max file size

# Ensure directories exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(MODEL_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def cleanup_old_files():
    """Clean up old uploads and models"""
    try:
        # Clean upload folder
        if os.path.exists(UPLOAD_FOLDER):
            shutil.rmtree(UPLOAD_FOLDER)
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)
        
        # Clean model folder
        if os.path.exists(MODEL_FOLDER):
            shutil.rmtree(MODEL_FOLDER)
        os.makedirs(MODEL_FOLDER, exist_ok=True)
    except Exception as e:
        print(f"Error cleaning up old files: {e}")

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'message': 'Flask server is running'})

@app.route('/generate-glb', methods=['POST'])
def generate_glb():
    try:
        print("🚀 Starting GLB generation request...")
        
        # Clean up old files first
        cleanup_old_files()
        
        # Check if photoData is provided
        if 'photoData' not in request.form:
            return jsonify({'error': 'Missing photoData'}), 400
        
        # Parse photo data
        try:
            photo_data = json.loads(request.form['photoData'])
            print(f"📊 Received {len(photo_data)} photo data points")
        except json.JSONDecodeError:
            return jsonify({'error': 'Invalid photoData JSON'}), 400
        
        # Check if files are provided
        if 'photos' not in request.files:
            return jsonify({'error': 'No photos provided'}), 400
        
        files = request.files.getlist('photos')
        if len(files) == 0:
            return jsonify({'error': 'No photos selected'}), 400
        
        print(f"📸 Received {len(files)} photo files")
        
        # Create session-specific directories
        session_id = str(hash(str(photo_data[0]['timestamp']) if photo_data else 'default'))
        session_upload_dir = os.path.join(UPLOAD_FOLDER, session_id)
        session_model_dir = os.path.join(MODEL_FOLDER, session_id)
        
        os.makedirs(session_upload_dir, exist_ok=True)
        os.makedirs(session_model_dir, exist_ok=True)
        
        # Save uploaded photos
        saved_files = []
        for i, file in enumerate(files):
            if file and allowed_file(file.filename):
                # Use index-based naming to match photo data
                filename = f"photo_{i}.jpg"
                filepath = os.path.join(session_upload_dir, filename)
                file.save(filepath)
                saved_files.append(filepath)
                print(f"✅ Saved photo {i}: {filename}")
        
        if len(saved_files) == 0:
            return jsonify({'error': 'No valid photos were saved'}), 400
        
        # Update photo data with correct file paths
        for i, data_point in enumerate(photo_data):
            data_point['photoUri'] = f"photo_{i}.jpg"  # Use relative path
        
        # Save rotation.json
        rotation_file = os.path.join(session_upload_dir, 'rotation.json')
        with open(rotation_file, 'w') as f:
            json.dump(photo_data, f, indent=2)
        
        print(f"💾 Saved rotation data: {rotation_file}")
        
        # Run Python processing
        print("🐍 Starting Python processing...")
        
        # Change to the upload directory and run processing
        original_cwd = os.getcwd()
        try:
            os.chdir(session_upload_dir)
            
            # Create required subdirectories
            os.makedirs('photos', exist_ok=True)
            os.makedirs('masks', exist_ok=True)
            os.makedirs('model', exist_ok=True)
            
            # Move photos to photos subdirectory
            for i in range(len(saved_files)):
                src = f"photo_{i}.jpg"
                dst = f"photos/photo_{i}.jpg"
                if os.path.exists(src):
                    shutil.move(src, dst)
            
            # Run the processing
            process_photos('rotation.json')
            
            # Wait for GLB file to be generated with timeout
            glb_path = 'model/dome_sky_model.glb'
            max_wait_time = 30  # 30 seconds timeout
            wait_interval = 0.5  # Check every 500ms
            waited_time = 0
            
            print(f"🔍 Waiting for GLB file: {glb_path}")
            
            while not os.path.exists(glb_path) and waited_time < max_wait_time:
                time.sleep(wait_interval)
                waited_time += wait_interval
                if waited_time % 2 == 0:  # Log every 2 seconds
                    print(f"⏳ Still waiting for GLB... ({waited_time}s/{max_wait_time}s)")
            
            if os.path.exists(glb_path):
                # Additional check: make sure file is not empty and stable
                file_size = os.path.getsize(glb_path)
                if file_size > 0:
                    # Wait a bit more to ensure file is completely written
                    time.sleep(1)
                    print(f"✅ GLB file found: {glb_path} (size: {file_size} bytes)")

                    # FIXED: Create absolute paths to avoid same file error
                    source_glb_absolute = os.path.abspath(glb_path)
                    static_glb_absolute = os.path.abspath(os.path.join(original_cwd, STATIC_GLB_PATH))
                    
                    # Only copy if they're different files
                    if source_glb_absolute != static_glb_absolute:
                        os.makedirs(os.path.dirname(static_glb_absolute), exist_ok=True)
                        shutil.copy2(source_glb_absolute, static_glb_absolute)
                        print(f"✅ GLB updated at static path: {static_glb_absolute}")
                    else:
                        print(f"ℹ️ GLB already at correct location: {static_glb_absolute}")
                    
                    # Copy GLB to session model directory
                    final_glb_path = os.path.join(original_cwd, MODEL_FOLDER, session_id, 'dome_sky_model.glb')
                    
                    print(f"📁 Copying from: {source_glb_absolute}")
                    print(f"📁 Copying to: {final_glb_path}")
                    
                    # Make sure destination directory exists
                    final_dir = os.path.dirname(final_glb_path)
                    os.makedirs(final_dir, exist_ok=True)
                    
                    # Only copy if they're different files
                    final_glb_absolute = os.path.abspath(final_glb_path)
                    if source_glb_absolute != final_glb_absolute:
                        shutil.copy2(source_glb_absolute, final_glb_path)
                        print(f"✅ GLB copied to session directory: {final_glb_path}")
                    else:
                        print(f"ℹ️ GLB already at session location: {final_glb_path}")
                    
                    # Verify the copy was successful (check either location)
                    if os.path.exists(final_glb_path) or os.path.exists(static_glb_absolute):
                        file_size_final = os.path.getsize(final_glb_path) if os.path.exists(final_glb_path) else file_size
                        print(f"✅ GLB processing completed successfully (size: {file_size_final} bytes)")
                        
                        # Return success with download URL
                        download_url = f"/download-glb/{session_id}"
                        
                        return jsonify({
                            'success': True,
                            'message': 'GLB generated successfully',
                            'download_url': download_url,
                            'session_id': session_id,
                            'photos_processed': len(saved_files)
                        })
                    else:
                        print(f"❌ Failed to verify GLB file creation")
                        return jsonify({'error': 'Failed to verify GLB file'}), 500
                else:
                    print(f"❌ GLB file exists but is empty: {glb_path}")
                    return jsonify({'error': 'GLB file is empty'}), 500
            else:
                print(f"❌ GLB file not found after {max_wait_time}s timeout")
                print(f"📁 Contents of session_upload_dir: {os.listdir('.')}")
                if os.path.exists('model'):
                    print(f"📁 Contents of model dir: {os.listdir('model')}")
                return jsonify({'error': 'GLB file was not generated within timeout'}), 500
                
        finally:
            os.chdir(original_cwd)
        
    except Exception as e:
        print(f"❌ Error in generate_glb: {e}")
        print(traceback.format_exc())
        return jsonify({'error': f'Server error: {str(e)}'}), 500
    
# Add a new endpoint to serve the static GLB
@app.route('/static-glb', methods=['GET'])
def get_static_glb():
    """Serve the static GLB file that gets overwritten with each generation."""
    try:
        if os.path.exists(STATIC_GLB_PATH):
            return send_from_directory('./model', 'dome_sky_model.glb', mimetype='model/gltf-binary')
        else:
            return jsonify({'error': 'No GLB model available yet'}), 404
    except Exception as e:
        return jsonify({'error': f'Error serving GLB: {str(e)}'}), 500
    

@app.route('/download-glb/<session_id>', methods=['GET'])
def download_glb(session_id):
    try:
        # Use absolute path for model directory
        session_model_dir = os.path.abspath(os.path.join(MODEL_FOLDER, session_id))
        glb_file = 'dome_sky_model.glb'
        glb_path = os.path.join(session_model_dir, glb_file)
        
        print(f"📥 Download request for session: {session_id}")
        print(f"📁 Looking in directory: {session_model_dir}")
        print(f"📄 Looking for file: {glb_path}")
        print(f"✅ File exists: {os.path.exists(glb_path)}")
        
        if os.path.exists(session_model_dir):
            print(f"📁 Directory contents: {os.listdir(session_model_dir)}")
        else:
            print(f"❌ Directory does not exist: {session_model_dir}")
            return jsonify({'error': 'Session directory not found'}), 404
        
        if os.path.exists(glb_path):
            print(f"✅ Sending file: {glb_path}")
            return send_from_directory(session_model_dir, glb_file, as_attachment=True)
        else:
            print(f"❌ GLB file not found at: {glb_path}")
            return jsonify({'error': 'GLB file not found'}), 404
    except Exception as e:
        print(f"❌ Download error: {e}")
        print(traceback.format_exc())
        return jsonify({'error': f'Download error: {str(e)}'}), 500


@app.route('/stream-glb/<session_id>', methods=['GET'])
def stream_glb(session_id):
    """Stream GLB file for direct loading in Three.js"""
    try:
        session_model_dir = os.path.abspath(os.path.join(MODEL_FOLDER, session_id))
        glb_file = 'dome_sky_model.glb'
        glb_path = os.path.join(session_model_dir, glb_file)
        
        if os.path.exists(glb_path):
            return send_from_directory(session_model_dir, glb_file, mimetype='model/gltf-binary')
        else:
            return jsonify({'error': 'GLB file not found'}), 404
    except Exception as e:
        return jsonify({'error': f'Stream error: {str(e)}'}), 500

if __name__ == '__main__':
    print("🌟 Starting Flask server...")
    print(f"📁 Upload folder: {UPLOAD_FOLDER}")
    print(f"📁 Model folder: {MODEL_FOLDER}")
    app.run(host='0.0.0.0', port=5002, debug=True)
