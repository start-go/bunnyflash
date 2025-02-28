import tkinter as tk
from tkinter import filedialog, ttk
from PIL import Image, ImageTk
import os

class ImageCropper:
    def __init__(self, root):
        self.root = root
        self.root.title("Image Cropper")

        self.image_path = None
        self.image = None
        self.tk_image = None
        self.rectangles = []
        self.is_dragging = False
        self.start_x, self.start_y = 0, 0
        self.current_rectangle = None

        self.canvas = tk.Canvas(root)
        self.canvas.pack(fill=tk.BOTH, expand=True)
        self.canvas.bind("<Button-1>", self.on_canvas_click)
        self.canvas.bind("<B1-Motion>", self.on_canvas_drag)
        self.canvas.bind("<ButtonRelease-1>", self.on_canvas_release)

        self.menu_bar = tk.Menu(root)
        self.file_menu = tk.Menu(self.menu_bar, tearoff=0)
        self.file_menu.add_command(label="Open", command=self.open_image)
        self.file_menu.add_command(label="Save Cropped", command=self.save_cropped)
        self.file_menu.add_separator()
        self.file_menu.add_command(label="Exit", command=root.quit)
        self.menu_bar.add_cascade(label="File", menu=self.file_menu)
        root.config(menu=self.menu_bar)

    def open_image(self):
        self.image_path = filedialog.askopenfilename(filetypes=[("Image files", "*.png;*.jpg;*.jpeg")])
        if self.image_path:
            self.image = Image.open(self.image_path)
            self.tk_image = ImageTk.PhotoImage(self.image)
            self.canvas.config(width=self.image.width, height=self.image.height)
            self.canvas.create_image(0, 0, anchor=tk.NW, image=self.tk_image)
            self.rectangles = []  # Clear previous rectangles
            self.canvas.delete("rect") # clear rectangles from canvas
            self.canvas.image = self.tk_image #keep reference

    def on_canvas_click(self, event):
        if self.image:
            self.start_x, self.start_y = event.x, event.y
            self.current_rectangle = self.canvas.create_rectangle(
                self.start_x, self.start_y, self.start_x, self.start_y, outline="red", tags="rect"
            )
            self.is_dragging = True

    def on_canvas_drag(self, event):
        if self.is_dragging and self.image:
            self.canvas.coords(self.current_rectangle, self.start_x, self.start_y, event.x, event.y)

    def on_canvas_release(self, event):
        if self.is_dragging and self.image:
            self.is_dragging = False
            coords = self.canvas.coords(self.current_rectangle)
            self.rectangles.append(coords)
            self.current_rectangle = None

    def save_cropped(self):
        if self.image and self.rectangles:
            output_dir = filedialog.askdirectory()
            if output_dir:
                for i, coords in enumerate(self.rectangles):
                    left, top, right, bottom = map(int, coords)
                    cropped_image = self.image.crop((left, top, right, bottom))
                    output_path = os.path.join(output_dir, f"cropped_{i}.png")
                    cropped_image.save(output_path)
                tk.messagebox.showinfo("Saved", "Cropped images saved successfully!")
def main():
    root = tk.Tk()
    app = ImageCropper(root)
    root.mainloop()

if __name__ == "__main__":
    main()