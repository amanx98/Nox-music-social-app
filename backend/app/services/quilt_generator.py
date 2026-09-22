import os
import httpx
from PIL import Image
from io import BytesIO
import uuid

QUILT_OUTPUT_DIR = "static/quilts"
TILE_SIZE = 300  # each album cover resized to 300x300

os.makedirs(QUILT_OUTPUT_DIR, exist_ok=True)

async def generate_quilt(albums: list[dict], grid_size: int = 3) -> str:
    """Takes a list of album dicts (with image_url) and returns the saved file path."""
    canvas_size = grid_size * TILE_SIZE
    canvas = Image.new("RGB", (canvas_size, canvas_size), "black")

    drawn_count = 0
    max_tiles = grid_size * grid_size

    async with httpx.AsyncClient(verify=False) as client:
        for album in albums:
            if drawn_count >= max_tiles:
                break
            
            image_url = album.get("image_url")
            # Skip if missing or if it's the Last.fm default grey star placeholder
            if not image_url or "2a96cbd8b46e442fc41c2b86b821562f" in image_url:
                continue
                
            try:
                response = await client.get(image_url)
                if response.status_code != 200:
                    continue
                img = Image.open(BytesIO(response.content)).convert("RGB")
                img = img.resize((TILE_SIZE, TILE_SIZE))

                row = drawn_count // grid_size
                col = drawn_count % grid_size
                canvas.paste(img, (col * TILE_SIZE, row * TILE_SIZE))
                drawn_count += 1
            except Exception:
                continue

    filename = f"{uuid.uuid4().hex}.png"
    filepath = os.path.join(QUILT_OUTPUT_DIR, filename)
    canvas.save(filepath)
    return filepath