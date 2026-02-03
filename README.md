# unhexo

**unhexo** is a modern, free and open-source hex editor.

Primary development happens on [Codeberg](https://codeberg.org/igorzizinio/unhexo).
A [GitHub](https://github.com/igorzizinio/unhexo) repository is provided as a **read-only mirror** for visibility purposes.

Please report issues and open pull requests on [Codeberg](https://codeberg.org/igorzizinio/unhexo).

---

## Project Status

unhexo is in **early development**.

The project is still experimental and design, features, and behavior may change frequently.

---

## Planned Features

Features currently planned or under development:

- [ ] Hex file reading
  - [ ] Chunked file reading (large files)
- [ ] Tabs and workspaces
  - [ ] Persist state in local storage
  - [ ] Workspaces track closed tabs
- [ ] File comparison
- [ ] Theming

---

## Design Inspirations

- Visual Studio Code  
- Obsidian  
- Notion (desktop)

---

## Does it support large files? (・_・?)

Yes.

In my tests, a **33GB** file opened instantly.  
No full file loading — just opening… something *very* big.

(≧◡≦)

> 33GB?  
> In this hex editor?  
> Yeah… so big... it fits. (⁄ ⁄•⁄ω⁄•⁄ ⁄)  
> (≖‿≖)

## License

Unhexo is free software licensed under the **GNU General Public License version 3 (GPL-3.0-only)**.

```license
Copyright (C) 2026 Igor S. Zizinio

This program is free software: you can redistribute it and/or modify  
it under the terms of the GNU General Public License as published by  
the Free Software Foundation, version 3 of the License.

This program is distributed in the hope that it will be useful,  
but WITHOUT ANY WARRANTY; without even the implied warranty of  
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the  
GNU General Public License for more details.

You should have received a copy of the GNU General Public License  
along with this program. If not, see <https://www.gnu.org/licenses/>.
```
