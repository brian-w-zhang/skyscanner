import cv2
import numpy as np
from matplotlib import pyplot as plt
import os

def load_image(image_path):
    image = cv2.imread(image_path)
    if image is None:
        print(f"Error: Unable to load image at {image_path}")
        return None
    return image

def filter_sky_contours(mask, image_height, min_area=8000, max_area=None, height_ratio=0.2):
    """
    Filter contours that are likely to be the sky based on area and position.
    
    Parameters:
    - mask: Binary mask where the sky is white and the rest is black.
    - image_height: Height of the original image.
    - min_area: Minimum area of a contour to be considered as sky.
    - max_area: Maximum area of a contour to be considered as sky.
    - height_ratio: The ratio of the image height where we expect the sky to be located.
    
    Returns:
    - sky_mask: Refined binary mask with filtered sky regions.
    """
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    sky_mask = np.zeros_like(mask)
    for contour in contours:
        area = cv2.contourArea(contour)
        x, y, w, h = cv2.boundingRect(contour)
        aspect_ratio = w / float(h)

        convex_hull_area = cv2.contourArea(cv2.convexHull(contour))
        if convex_hull_area > 0:  # Ensure the denominator is not zero
            smoothness = area / convex_hull_area
        else:
            smoothness = 1  # Or some other default value that makes sense for your application

        if (area > min_area) and (max_area is None or area < max_area) and (y < image_height * height_ratio):
            if aspect_ratio > 1 and smoothness > 0.5:  # Adjust thresholds as necessary
                cv2.drawContours(sky_mask, [contour], -1, (255), thickness=cv2.FILLED)
    return sky_mask

def detect_edges(image):
    # Convert to grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # Apply bilateral filter to preserve edges while reducing noise
    bilateral = cv2.bilateralFilter(gray, d=9, sigmaColor=75, sigmaSpace=75)
    
    # Use a combination of Sobel filters to find gradients
    sobelx = cv2.Sobel(bilateral, cv2.CV_64F, 1, 0, ksize=3)
    sobely = cv2.Sobel(bilateral, cv2.CV_64F, 0, 1, ksize=3)
    
    # Combine the gradients
    gradient_magnitude = cv2.magnitude(sobelx, sobely)
    gradient_magnitude = np.uint8(gradient_magnitude)
    
    # Apply thresholding to get binary result
    _, edge_binary = cv2.threshold(gradient_magnitude, 20, 255, cv2.THRESH_BINARY)
    
    # Optionally, you can apply dilation followed by erosion to close gaps
    kernel = np.ones((3,3), np.uint8)
    edge_dilated = cv2.dilate(edge_binary, kernel, iterations=1)
    edge_processed = cv2.erode(edge_dilated, kernel, iterations=1)
    
    return edge_processed

def adaptive_threshold_sky(image):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    return cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                                 cv2.THRESH_BINARY,21,2)

def refine_mask(mask):
    kernel = np.ones((35,35), np.uint8)
    return cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)

def segment_sky(image):
    # Detect edges.
    edges = detect_edges(image)

    # Invert the edges.
    edges_inv = cv2.bitwise_not(edges)

    # Create a color mask using adaptive thresholding.
    color_mask = adaptive_threshold_sky(image)

    # Combine the color mask with the inverted edges to get an initial sky mask.
    combined_mask = cv2.bitwise_and(color_mask, edges_inv)

    # Filter contours that are likely to be the sky and refine the mask.
    refined_mask_contour = filter_sky_contours(combined_mask, image.shape[0])

    # Optionally, you can further refine the mask with morphological operations if needed.
    refined_mask_morph = refine_mask(refined_mask_contour)

    # Apply the final refined mask to segment the sky.
    segmented_sky = cv2.bitwise_and(image, image, mask=refined_mask_morph)
    contours, _ = cv2.findContours(refined_mask_morph, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    return segmented_sky, contours

def get_sky_mask(image):
    """
    Get binary sky mask from image.
    
    Parameters:
    - image: Input image
    
    Returns:
    - mask: Binary mask where sky pixels are white (255) and non-sky pixels are black (0)
    """
    # Detect edges.
    edges = detect_edges(image)

    # Invert the edges.
    edges_inv = cv2.bitwise_not(edges)

    # Create a color mask using adaptive thresholding.
    color_mask = adaptive_threshold_sky(image)

    # Combine the color mask with the inverted edges to get an initial sky mask.
    combined_mask = cv2.bitwise_and(color_mask, edges_inv)

    # Filter contours that are likely to be the sky and refine the mask.
    refined_mask_contour = filter_sky_contours(combined_mask, image.shape[0])

    # Optionally, you can further refine the mask with morphological operations if needed.
    refined_mask_morph = refine_mask(refined_mask_contour)

    return refined_mask_morph

def process_single_photo(photo_data, photos_dir, masks_dir):
    """
    Process a single photo and generate its mask.
    
    Parameters:
    - photo_data: Dictionary containing photo information
    - photos_dir: Directory containing photos
    - masks_dir: Directory to save masks
    
    Returns:
    - success: Boolean indicating if processing was successful
    """
    try:
        # Extract filename from photoUri
        photo_filename = os.path.basename(photo_data['photoUri'])
        photo_path = os.path.join(photos_dir, photo_filename)
        
        # Load image
        image = load_image(photo_path)
        if image is None:
            print(f"Failed to load image: {photo_path}")
            return False
        
        # Get sky mask
        mask = get_sky_mask(image)
        
        # Save mask with index as filename
        mask_filename = f"{photo_data['index']}.jpg"
        mask_path = os.path.join(masks_dir, mask_filename)
        cv2.imwrite(mask_path, mask)
        
        print(f"Generated mask for photo {photo_data['index']}: {mask_filename}")
        return True
        
    except Exception as e:
        print(f"Error processing photo {photo_data.get('index', 'unknown')}: {e}")
        return False

def display_results_with_contours(original, segmented, edges, contours):
    # Create a copy of the original image to draw contours on.
    image_with_contours = original.copy()
    cv2.drawContours(image_with_contours, contours, -1, (0, 255, 0), 3)

    plt.figure(figsize=(12, 8))

    plt.subplot(1, 4, 1)
    plt.imshow(cv2.cvtColor(original, cv2.COLOR_BGR2RGB))
    plt.title('Original Image')

    plt.subplot(1, 4, 2)
    plt.imshow(edges, cmap='gray')
    plt.title('Edges')

    plt.subplot(1, 4, 3)
    plt.imshow(cv2.cvtColor(segmented, cv2.COLOR_BGR2RGB))
    plt.title('Segmented Sky')

    plt.subplot(1, 4, 4)
    plt.imshow(cv2.cvtColor(image_with_contours, cv2.COLOR_BGR2RGB))
    plt.title('Contours')

    plt.show()
