from PIL import Image, ImageDraw

def perfect_crop(img_path, out_path):
    img = Image.open(img_path).convert("RGBA")
    width, height = img.size
    
    # 1. Find bounding box of everything that is NOT white
    min_x = width
    min_y = height
    max_x = 0
    max_y = 0
    
    pixels = img.load()
    
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            # If not white-ish (meaning it's the orange logo)
            if not (r > 240 and g > 240 and b > 240):
                if x < min_x: min_x = x
                if y < min_y: min_y = y
                if x > max_x: max_x = x
                if y > max_y: max_y = y

    print(f"Original size: {width}x{height}")
    print(f"Bounding box: {min_x}, {min_y}, {max_x}, {max_y}")
    
    # Add a tiny 2px padding to the bounding box so we don't clip the rounded edges
    padding = 2
    min_x = max(0, min_x - padding)
    min_y = max(0, min_y - padding)
    max_x = min(width, max_x + padding)
    max_y = min(height, max_y + padding)
    
    # 2. Crop tightly!
    img = img.crop((min_x, min_y, max_x, max_y))
    
    # 3. Flood fill the 4 corners with transparent
    ImageDraw.floodfill(img, (0, 0), (255, 255, 255, 0), thresh=30)
    ImageDraw.floodfill(img, (img.width-1, 0), (255, 255, 255, 0), thresh=30)
    ImageDraw.floodfill(img, (0, img.height-1), (255, 255, 255, 0), thresh=30)
    ImageDraw.floodfill(img, (img.width-1, img.height-1), (255, 255, 255, 0), thresh=30)

    img.save(out_path, "PNG")
    print(f"Cropped size: {img.size}")

# Process the image
perfect_crop('frontend/public/logo.png', 'frontend/public/favicon.png')
