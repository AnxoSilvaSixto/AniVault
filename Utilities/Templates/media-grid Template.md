>[!danger] Required CSS
>You need media-grid.css enabled in your snippets folder for this template to work.
>
>**Setup:** Settings → Appearance → CSS snippets → Enable "media-grid"

>[!info] About This Template
>Creates a three-column grid layout for organizing media relationships (prequels, sequels, spin-offs) for Obsidian. Each entry includes a poster image and caption that links to a note.
# Visual Example

<div class="media-grid">
	<div class="media-column prequels">
		<h4>Prequels</h4>
		<a href="NOTE-NAME" class="internal-link">
			<img src="https://cdn.stocksnap.io/img-thumbs/960w/panther-cat_B604E65EC1.jpg" class="media-poster" alt="Broken link">
		</a>
		<p class="media-caption">Prequel of a Cute Cat</p>
	</div>
	<div class="media-column side-stories">
		<h4>Side Stories</h4>
		<a href="NOTE-NAME" class="internal-link">
			<img src="https://cdn.stocksnap.io/img-thumbs/960w/gray-cat_OU5O7ZUVH7.jpg" class="media-poster" alt="Broken link">
		</a>
		<p class="media-caption">Spin off of a Cute Cat</p>
		<a href="NOTE-NAME" class="internal-link">
			<img src="https://cdn.stocksnap.io/img-thumbs/960w/cat-animal_6MVVZEF94T.jpg" class="media-poster" alt="Broken link">
		</a>
		<p class="media-caption">OVA of a Cute Cat</p>
	</div>
	<div class="media-column sequels">
		<h4>Sequels</h4>
		<a href="NOTE-NAME" class="internal-link">
			<img src="https://cdn.stocksnap.io/img-thumbs/960w/black-cat_46VP4U7UQQ.jpg" class="media-poster" alt="Broken link">
		</a>
		<p class="media-caption">Sequel of a Cute Cat</p>
	</div>
</div>

# How to Use
**Step 1:** Choose a template below (Core, Entry Block, or Full)  
**Step 2:** Copy the HTML code  
**Step 3:** Paste into your Obsidian note  
**Step 4:** Replace placeholder values:

| Placeholder | Replace With | Example |
|-------------|--------------|---------|
| `NOTE-NAME` | Your note name | `Attack on Titan S1` |
| `IMAGE-PATH.jpg` | Image URL or path | `https://example.com/poster.jpg` |
| `SERIES TITLE` | Display name | `Attack on Titan Season 1` |
**Step 5:** Keep the position class on each column:
- `<div class="media-column prequels">` for Prequels
- `<div class="media-column side-stories">` for Side Stories
- `<div class="media-column sequels">` for Sequels
>[!warning] Important
>The position classes (prequels, side-stories, sequels) are required for correct layout. Do not remove them.
# Templates
## Core Template
Empty grid structure. Add entry blocks where marked.
```html
<div class="media-grid">

	<!-- PREQUELS -->
	<div class="media-column prequels">
		<h4>Prequels</h4>
		<!-- Add entries below -->
	</div>

	<!-- SIDE STORIES -->
	<div class="media-column side-stories">
		<h4>Side Stories</h4>
		<!-- Add entries below -->
	</div>

	<!-- SEQUELS -->
	<div class="media-column sequels">
		<h4>Sequels</h4>
		<!-- Add entries below -->
	</div>

</div>
```
## Entry Block
Single media entry. Copy this to add individual items.
```html
<a href="NOTE-NAME" class="internal-link">
	<img src="IMAGE-PATH.jpg" class="media-poster" alt="Broken link">
</a>
<p class="media-caption">SERIES TITLE</p>
```
## Full Template
Complete example with one entry per column.
```html
<div class="media-grid">

	<!-- PREQUELS -->
	<div class="media-column prequels">
		<h4>Prequels</h4>
		<a href="NOTE-NAME" class="internal-link">
			<img src="IMAGE-PATH.jpg" class="media-poster" alt="Broken link">
		</a>
		<p class="media-caption">SERIES TITLE</p>
	</div>

	<!-- SIDE STORIES -->
	<div class="media-column side-stories">
		<h4>Side Stories</h4>
		<a href="NOTE-NAME" class="internal-link">
			<img src="IMAGE-PATH.jpg" class="media-poster" alt="Broken link">
		</a>
		<p class="media-caption">SERIES TITLE</p>
	</div>

	<!-- SEQUELS -->
	<div class="media-column sequels">
		<h4>Sequels</h4>
		<a href="NOTE-NAME" class="internal-link">
			<img src="IMAGE-PATH.jpg" class="media-poster" alt="Broken link">
		</a>
		<p class="media-caption">SERIES TITLE</p>
	</div>

</div>
```
# Troubleshooting
**Grid not displaying correctly**
- Verify CSS snippet is enabled: Settings → Appearance → CSS snippets
- Toggle "media-grid" OFF then ON
- Reload note (close and reopen)

**Images not showing**
- Check image URLs are valid and accessible
- Test URL by opening in browser
- Verify local image paths are correct

**Links not working**
- Note names are case-sensitive
- Ensure linked notes exist in your vault
- Check for typos in note names

**Columns in wrong positions**
- Verify each column div includes its position class
- Example: `<div class="media-column prequels">`
- Do not remove or modify these classes

**Borders cut off on edges**
- This is fixed in the current CSS version
- Reload CSS snippet if issue persists