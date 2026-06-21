import 'package:flutter/material.dart';

class GeneratedView extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      child: Column(
        children: [
    AppBar(
        title: Text("MyApp"),
      ),
    Column(
        children: [
    AppBar(
          title: Text("Dashboard"),
        ),
    Column(
          children: [
    Card(
            child: Text("Revenue \$12,345 +12%"),
          ),
          ],
        ),
    Container(
          child: Column(
            children: [
    Text("© 2026 MyApp. All rights reserved."),
            ],
          ),
        ),
        ],
      ),
        ],
      ),
    );
  }
}
