# Extension Icons

This directory should contain the extension icons in the following sizes:

- `icon16.png` - 16x16 pixels (toolbar icon, small)
- `icon48.png` - 48x48 pixels (extension management page)
- `icon128.png` - 128x128 pixels (Chrome Web Store, installation)

## Icon Design Guidelines

### Design Recommendations:
- Use a shield or security symbol
- Include visual elements suggesting email/mail
- Use colors: Blue (#667eea) and Purple (#764ba2) from the extension theme
- Keep design simple and recognizable at small sizes
- Ensure good contrast on both light and dark backgrounds

### Creating Icons

You can create these icons using:
- Online tools: Canva, Figma, or Adobe Express
- Image editors: GIMP, Photoshop, or Sketch
- Icon generators: https://www.favicon-generator.org/

### Placeholder Icons

For development, you can use simple colored squares:

**Using ImageMagick:**
```bash
# Install ImageMagick
# Ubuntu: sudo apt-get install imagemagick
# Mac: brew install imagemagick

# Generate placeholder icons
convert -size 16x16 xc:#667eea icon16.png
convert -size 48x48 xc:#667eea icon48.png
convert -size 128x128 xc:#667eea icon128.png
```

**Using Python (PIL):**
```python
from PIL import Image, ImageDraw, ImageFont

def create_icon(size, filename):
    # Create blue-purple gradient
    img = Image.new('RGB', (size, size), '#667eea')
    draw = ImageDraw.Draw(img)
    
    # Draw shield shape (simplified)
    draw.ellipse([size//4, size//4, 3*size//4, 3*size//4], fill='#764ba2')
    
    img.save(filename)

create_icon(16, 'icon16.png')
create_icon(48, 'icon48.png')
create_icon(128, 'icon128.png')
```

### Production Icons

For production deployment, create professional icons with:
- Clear shield symbol representing security
- Email envelope or @ symbol
- Consistent color scheme
- Professional polish and detail

### Icon Ideas

1. **Shield with Email**: 🛡️📧
2. **Lock with Envelope**: 🔒✉️
3. **Guard/Protection Symbol**: ⚔️🛡️
4. **Checkmark in Shield**: ✓🛡️

### Notes

- PNG format with transparency recommended
- Maintain consistent padding/margins across all sizes
- Test icons on both light and dark browser themes
- Ensure icons are clear and recognizable when small
